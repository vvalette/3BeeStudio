import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { sendNfcOrderEmails } from '@/lib/resend'
import { sendCriticalAlert } from '@/lib/alert'
import { confirmShopOrder } from '@/lib/confirm-shop-order'
import { confirmCustomPayment } from '@/lib/confirm-custom-payment'
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

type Metadata = Stripe.Metadata | null | undefined

function failed() {
  return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
}

// Commande NFC payée : statut confirmé puis emails. Idempotent — sur un rejeu,
// le filtre status ne matche plus rien et aucun email ne repart.
async function confirmNfcOrder(orderId: string, via: string): Promise<{ error?: true }> {
  const { data: updatedOrder, error } = await supabaseAdmin
    .from('orders')
    .update({ status: 'confirmed' })
    .eq('id', orderId)
    .eq('status', 'pending_payment')
    .select()
    .maybeSingle() // rejeu → 0 ligne sans erreur (single() aurait renvoyé PGRST116)

  if (error) {
    console.error(`[webhook] Erreur Supabase update NFC (${via}):`, error)
    await sendCriticalAlert('Webhook Stripe — échec confirmation commande NFC', {
      orderId,
      via,
      erreur: error.message,
      consequence: 'Commande payée potentiellement bloquée en pending_payment',
    })
    return { error: true }
  }

  console.info('[webhook]', JSON.stringify({ event: 'nfc_order_confirmed', orderId, via }))
  if (updatedOrder) await sendNfcOrderEmails(updatedOrder as Order)
  return {}
}

// Aiguillage d'un paiement confirmé vers sa commande, selon la metadata posée à
// la création de la session. `sessionId` sert au sur-mesure : il distingue un
// rejeu d'un second paiement sur un autre lien.
async function confirmFromMetadata(metadata: Metadata, sessionId: string, via: string) {
  let result: { error?: true } = {}

  if (metadata?.shop_order_id) {
    result = await confirmShopOrder(metadata.shop_order_id)
  } else if (metadata?.custom_order_id && metadata.type === 'custom_deposit') {
    result = await confirmCustomPayment(metadata.custom_order_id, 'deposit', sessionId)
  } else if (metadata?.custom_order_id && metadata.type === 'custom_balance') {
    // Solde : ne touche pas au statut, c'est l'expédition qui fait avancer la timeline.
    result = await confirmCustomPayment(metadata.custom_order_id, 'balance', sessionId)
  } else if (metadata?.order_id) {
    result = await confirmNfcOrder(metadata.order_id, via)
  }

  return result.error ? failed() : NextResponse.json({ received: true })
}

function confirmFromSession(session: Stripe.Checkout.Session, via: string) {
  return confirmFromMetadata(session.metadata, session.id, via)
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

    // `async_payment_succeeded` : paiement différé (SEPA…) confirmé après coup.
    // La session arrive alors en `paid`, même traitement qu'un paiement immédiat.
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.payment_status !== 'paid') {
        // Paiement asynchrone — on attend async_payment_succeeded / payment_intent.succeeded
        console.info('[webhook]', JSON.stringify({ event: 'session_awaiting_payment', sessionId: session.id, paymentStatus: session.payment_status }))
        return NextResponse.json({ received: true })
      }
      if (!session.metadata?.order_id && !session.metadata?.shop_order_id && !session.metadata?.custom_order_id) {
        console.error('[webhook] session payée sans commande dans metadata', session.id)
        return NextResponse.json({ received: true })
      }
      return await confirmFromSession(session, event.type)
    }

    // Fallback : payment_intent.succeeded (paiements asynchrones, ou checkout dont
    // la metadata n'est portée que par la session)
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent
      if (pi.metadata?.shop_order_id || pi.metadata?.order_id) {
        return await confirmFromMetadata(pi.metadata, pi.id, 'payment_intent.succeeded')
      }
      // Chercher la session Checkout associée au payment intent
      const sessions = await stripe.checkout.sessions.list({ payment_intent: pi.id, limit: 1 })
      const session = sessions.data[0]
      if (session) return await confirmFromSession(session, 'session lookup')
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
