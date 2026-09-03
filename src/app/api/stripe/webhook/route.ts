import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { sendNfcOrderEmails } from '@/lib/resend'
import { sendCriticalAlert } from '@/lib/alert'
import { confirmShopOrder } from '@/lib/confirm-shop-order'
import { snapshotAbandonedCart } from '@/lib/abandoned-cart'
import type { Order } from '@/types/order'
import Stripe from 'stripe'

// Session Stripe abandonnée / expirée sans paiement : on nettoie la commande fantôme
// et on libère la promo newsletter éventuellement consommée à la création de la session.
async function releaseExpiredCheckout(session: Stripe.Checkout.Session) {
  const shopOrderId = session.metadata?.shop_order_id
  const orderId = session.metadata?.order_id
  const promoEmail = session.metadata?.newsletter_promo_email

  if (shopOrderId) {
    // Instantané AVANT la suppression : c'est le dernier endroit où le panier
    // existe encore. Le localStorage du client ne suffit pas (il a pu commencer
    // sur mobile et lire ses mails sur ordinateur), et une session Stripe
    // expirée ne rejoue pas ses lignes.
    await snapshotAbandonedCart(shopOrderId)
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

  // Panier abandonné : le code promo doit être rendu, sinon un code à usage
  // unique serait brûlé par quelqu'un qui n'a jamais payé.
  let codeReleased = 0
  if (shopOrderId) {
    const { data } = await supabaseAdmin.rpc('release_promo_code', { p_order_id: shopOrderId })
    codeReleased = data ?? 0
  }

  console.info('[webhook]', JSON.stringify({ event: 'checkout_expired', shopOrderId, orderId, promoReleased: !!promoEmail, codeReleased }))
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
            .update({ status: 'deposit_paid', deposit_paid_at: new Date().toISOString(), deposit_method: 'stripe' })
            .eq('id', customOrderId)
            .eq('status', 'quote_sent')
          if (error) {
            console.error('[webhook] Erreur custom_orders update:', error)
            await sendCriticalAlert('Webhook Stripe — échec confirmation acompte sur-mesure', {
              customOrderId,
              erreur: error.message,
              consequence: 'Acompte payé mais statut non mis à jour',
            })
          } else console.info('[webhook]', JSON.stringify({ event: 'custom_deposit_paid', customOrderId }))
        }
        return NextResponse.json({ received: true })
      }

      // Solde sur-mesure — second encaissement, après l'acompte. Ne touche pas au
      // statut : c'est l'expédition qui fait avancer la timeline.
      if (customOrderId && session.metadata?.type === 'custom_balance') {
        if (session.payment_status === 'paid') {
          const { error } = await supabaseAdmin
            .from('custom_orders')
            .update({ balance_paid_at: new Date().toISOString(), balance_method: 'stripe' })
            .eq('id', customOrderId)
            .is('balance_paid_at', null) // rejeu du webhook → aucune ligne touchée
          if (error) {
            console.error('[webhook] Erreur custom_orders solde:', error)
            await sendCriticalAlert('Webhook Stripe — échec confirmation solde sur-mesure', {
              customOrderId,
              erreur: error.message,
              consequence: 'Solde payé mais non enregistré — vérifier avant expédition',
            })
          } else console.info('[webhook]', JSON.stringify({ event: 'custom_balance_paid', customOrderId }))
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
          .maybeSingle() // rejeu → 0 ligne sans erreur (single() aurait renvoyé PGRST116)

        if (error) {
          console.error('[webhook] Erreur Supabase update:', error)
          await sendCriticalAlert('Webhook Stripe — échec confirmation commande NFC', {
            orderId,
            erreur: error.message,
            consequence: 'Commande payée potentiellement bloquée en pending_payment',
          })
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
        }

        console.info('[webhook]', JSON.stringify({ event: 'nfc_order_confirmed', orderId }))

        if (updatedOrder) {
          await sendNfcOrderEmails(updatedOrder as Order)
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
        const { data: updatedOrder, error } = await supabaseAdmin
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('id', orderId)
          .eq('status', 'pending_payment') // n'écraser que si encore en attente
          .select()
          .maybeSingle() // rejeu → 0 ligne sans erreur

        if (error) {
          console.error('[webhook] Erreur Supabase payment_intent update:', error)
          await sendCriticalAlert('Webhook Stripe — échec confirmation commande NFC', {
            orderId,
            via: 'payment_intent.succeeded',
            erreur: error.message,
          })
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
        }
        console.info('[webhook]', JSON.stringify({ event: 'nfc_order_confirmed_via_pi', orderId }))
        if (updatedOrder) {
          await sendNfcOrderEmails(updatedOrder as Order)
        }
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
            .maybeSingle() // rejeu → 0 ligne sans erreur (single() aurait renvoyé PGRST116)

          if (error) {
            console.error('[webhook] Erreur Supabase (via session lookup):', error)
            await sendCriticalAlert('Webhook Stripe — échec confirmation commande NFC', {
              orderId: sessionOrderId,
              via: 'session lookup',
              erreur: error.message,
            })
            return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
          }
          console.info('[webhook]', JSON.stringify({ event: 'nfc_order_confirmed_via_session_lookup', orderId: sessionOrderId }))
          if (updatedOrder) {
            await sendNfcOrderEmails(updatedOrder as Order)
          }
        }
      }
    }
  } catch (err) {
    console.error('[webhook] Erreur inattendue:', err)
    await sendCriticalAlert('Webhook Stripe — erreur inattendue', {
      eventType: event.type,
      erreur: err instanceof Error ? err.message : String(err),
      consequence: 'Stripe va retenter — vérifier les logs si les échecs persistent',
    })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
