import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { sendOrderConfirmation, sendShopOrderConfirmation } from '@/lib/resend'
import { revalidateShop } from '@/lib/revalidate'
import type { Order } from '@/types/order'
import type { ShopOrder } from '@/types/shop-order'
import Stripe from 'stripe'

// Confirme une commande boutique payée. Idempotent : le `.eq('status','pending_payment')`
// garantit un seul décrément de stock même si le webhook est rejoué (session.completed + payment_intent.succeeded).
// Retourne { error: true } uniquement sur un échec d'update DB (le caller doit alors renvoyer 500 pour que Stripe retente).
async function confirmShopOrder(shopOrderId: string): Promise<{ error?: true }> {
  const { data: updatedShop, error } = await supabaseAdmin
    .from('shop_orders')
    .update({ status: 'confirmed' })
    .eq('id', shopOrderId)
    .eq('status', 'pending_payment')
    .select()
    .single()

  if (error) {
    console.error('[webhook] Erreur shop_orders update:', error)
    return { error: true }
  }
  if (!updatedShop) return {} // déjà confirmée (rejeu idempotent)

  console.info('[webhook]', JSON.stringify({ event: 'shop_order_confirmed', shopOrderId }))

  const shopOrder = updatedShop as ShopOrder
  for (const item of shopOrder.items ?? []) {
    await supabaseAdmin
      .rpc('decrement_shop_stock', { p_product_id: item.product_id, p_qty: item.quantity })
      .then(({ error: rpcErr }) => {
        if (rpcErr) console.error('[webhook] Erreur décrément stock:', item.product_id, rpcErr)
      })
  }

  // Revalide les pages publiques pour refléter le nouveau stock
  // (ISR long = pas de régénération auto avant 1h sans ça).
  const productIds = (shopOrder.items ?? []).map((i) => i.product_id)
  if (productIds.length > 0) {
    const { data: rows } = await supabaseAdmin
      .from('shop_products')
      .select('slug')
      .in('id', productIds)
    revalidateShop(...(rows ?? []).map((r) => (r as { slug: string }).slug))
  }

  await sendShopOrderConfirmation(shopOrder).catch((err) =>
    console.error('[webhook] Email boutique non bloquant:', err),
  )

  return {}
}

// Session Stripe abandonnée / expirée sans paiement : on nettoie la commande fantôme
// et on libère la promo newsletter éventuellement consommée à la création de la session.
async function releaseExpiredCheckout(session: Stripe.Checkout.Session) {
  const shopOrderId = session.metadata?.shop_order_id
  const orderId = session.metadata?.order_id
  const promoEmail = session.metadata?.newsletter_promo_email

  if (shopOrderId) {
    await supabaseAdmin.from('shop_orders').delete().eq('id', shopOrderId).eq('status', 'pending_payment')
  } else if (orderId) {
    await supabaseAdmin.from('orders').delete().eq('id', orderId).eq('status', 'pending_payment')
  }

  if (promoEmail) {
    await supabaseAdmin
      .from('newsletter_subscriptions')
      .update({ promo_used: false })
      .eq('email', promoEmail)
  }

  console.info('[webhook]', JSON.stringify({ event: 'checkout_expired', shopOrderId, orderId, promoReleased: !!promoEmail }))
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    console.error('[webhook] stripe-signature header manquant')
    return NextResponse.json({ error: 'Signature manquante' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[webhook] Signature invalide:', err)
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 })
  }

  console.info('[webhook]', JSON.stringify({ event: event.type }))

  try {
    if (event.type === 'checkout.session.expired') {
      await releaseExpiredCheckout(event.data.object as Stripe.Checkout.Session)
      return NextResponse.json({ received: true })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.order_id

      // Commande boutique
      const shopOrderId = session.metadata?.shop_order_id
      if (shopOrderId && session.metadata?.type === 'shop_order') {
        if (session.payment_status === 'paid') {
          const result = await confirmShopOrder(shopOrderId)
          if (result.error) return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
        }
        return NextResponse.json({ received: true })
      }

      // Acompte sur-mesure
      const customOrderId = session.metadata?.custom_order_id
      if (customOrderId && session.metadata?.type === 'custom_deposit') {
        if (session.payment_status === 'paid') {
          const { error } = await supabaseAdmin
            .from('custom_orders')
            .update({ status: 'deposit_paid' })
            .eq('id', customOrderId)
            .eq('status', 'quote_sent')
          if (error) console.error('[webhook] Erreur custom_orders update:', error)
          else console.info('[webhook]', JSON.stringify({ event: 'custom_deposit_paid', customOrderId }))
        }
        return NextResponse.json({ received: true })
      }

      if (!orderId) {
        console.error('[webhook] checkout.session.completed sans order_id dans metadata', session.id)
        return NextResponse.json({ received: true })
      }

      if (session.payment_status === 'paid') {
        const { data: updatedOrder, error } = await supabaseAdmin
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('id', orderId)
          .eq('status', 'pending_payment')
          .select()
          .single()

        if (error) {
          console.error('[webhook] Erreur Supabase update:', error)
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
        }

        console.info('[webhook]', JSON.stringify({ event: 'nfc_order_confirmed', orderId }))

        if (updatedOrder) {
          await sendOrderConfirmation(updatedOrder as Order).catch((err) =>
            console.error('[webhook] Email non bloquant:', err),
          )
        }
      } else {
        // Paiement asynchrone (virement, etc.) — on attend payment_intent.succeeded
        console.info('[webhook]', JSON.stringify({ event: 'session_awaiting_payment', orderId, paymentStatus: session.payment_status }))
      }
    }

    // Fallback : payment_intent.succeeded (ex. paiements asynchrones ou checkout sans metadata)
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      const orderId = pi.metadata?.order_id
      const shopOrderId = pi.metadata?.shop_order_id

      if (shopOrderId) {
        const result = await confirmShopOrder(shopOrderId)
        if (result.error) return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
      } else if (orderId) {
        const { error } = await supabaseAdmin
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('id', orderId)
          .eq('status', 'pending_payment') // n'écraser que si encore en attente

        if (error) {
          console.error('[webhook] Erreur Supabase payment_intent update:', error)
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
        }
        console.info('[webhook]', JSON.stringify({ event: 'nfc_order_confirmed_via_pi', orderId }))
      } else {
        // Chercher via stripe_checkout_session_id associée au payment intent
        const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 })
        const session = sessions.data[0]
        const sessionOrderId = session?.metadata?.order_id
        const sessionShopOrderId = session?.metadata?.shop_order_id

        if (sessionShopOrderId) {
          const result = await confirmShopOrder(sessionShopOrderId)
          if (result.error) return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
        } else if (sessionOrderId) {
          const { data: updatedOrder, error } = await supabaseAdmin
            .from('orders')
            .update({ status: 'confirmed' })
            .eq('id', sessionOrderId)
            .eq('status', 'pending_payment')
            .select()
            .single()

          if (error) {
            console.error('[webhook] Erreur Supabase (via session lookup):', error)
            return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
          }
          console.info('[webhook]', JSON.stringify({ event: 'nfc_order_confirmed_via_session_lookup', orderId: sessionOrderId }))
          if (updatedOrder) {
            await sendOrderConfirmation(updatedOrder as Order).catch((err) =>
              console.error('[webhook] Email non bloquant:', err),
            )
          }
        }
      }
    }
  } catch (err) {
    console.error('[webhook] Erreur inattendue:', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
