import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { sendOrderConfirmation, sendShopOrderConfirmation } from '@/lib/resend'
import type { Order } from '@/types/order'
import type { ShopOrder } from '@/types/shop-order'
import Stripe from 'stripe'

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

  console.log('[webhook] Événement reçu:', event.type)

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const orderId = session.metadata?.order_id

      // Commande boutique
      const shopOrderId = session.metadata?.shop_order_id
      if (shopOrderId && session.metadata?.type === 'shop_order') {
        if (session.payment_status === 'paid') {
          const { data: updatedShop, error } = await supabaseAdmin
            .from('shop_orders')
            .update({ status: 'confirmed' })
            .eq('id', shopOrderId)
            .eq('status', 'pending_payment')
            .select()
            .single()

          if (error) console.error('[webhook] Erreur shop_orders update:', error)
          else {
            console.log('[webhook] Commande boutique confirmée:', shopOrderId)
            if (updatedShop) {
              await sendShopOrderConfirmation(updatedShop as ShopOrder).catch((err) =>
                console.error('[webhook] Email boutique non bloquant:', err),
              )
            }
          }
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
          else console.log('[webhook] Acompte sur-mesure reçu:', customOrderId)
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

        console.log('[webhook] Commande confirmée:', orderId)

        if (updatedOrder) {
          await sendOrderConfirmation(updatedOrder as Order).catch((err) =>
            console.error('[webhook] Email non bloquant:', err),
          )
        }
      } else {
        // Paiement asynchrone (virement, etc.) — on attend payment_intent.succeeded
        console.log('[webhook] Session complète mais paiement non encore reçu (payment_status:', session.payment_status, ')')
      }
    }

    // Fallback : payment_intent.succeeded (ex. paiements asynchrones ou checkout sans metadata)
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      const orderId = pi.metadata?.order_id

      if (orderId) {
        const { error } = await supabaseAdmin
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('id', orderId)
          .eq('status', 'pending_payment') // n'écraser que si encore en attente

        if (error) console.error('[webhook] Erreur Supabase payment_intent update:', error)
        else console.log('[webhook] Commande confirmée via payment_intent:', orderId)
      } else {
        // Chercher via stripe_checkout_session_id associée au payment intent
        const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 })
        const session = sessions.data[0]
        const sessionOrderId = session?.metadata?.order_id

        if (sessionOrderId) {
          const { data: updatedOrder, error } = await supabaseAdmin
            .from('orders')
            .update({ status: 'confirmed' })
            .eq('id', sessionOrderId)
            .eq('status', 'pending_payment')
            .select()
            .single()

          if (error) console.error('[webhook] Erreur Supabase (via session lookup):', error)
          else {
            console.log('[webhook] Commande confirmée via session lookup:', sessionOrderId)
            if (updatedOrder) {
              await sendOrderConfirmation(updatedOrder as Order).catch((err) =>
                console.error('[webhook] Email non bloquant:', err),
              )
            }
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
