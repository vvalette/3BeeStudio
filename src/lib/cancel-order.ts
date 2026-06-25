import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { cancelBoxtalShipment } from '@/lib/boxtal'
import type { ShopOrder } from '@/types/shop-order'

export interface CancelResult {
  stripeRefunded: boolean
  boxtalCancelled: boolean
  boxtalError: string | null
}

// Rembourse Stripe + annule Boxtal pour une commande boutique.
// N'écrit PAS en base — le appelant décide de supprimer ou de passer en cancelled.
export async function refundAndCancelShipment(order: ShopOrder): Promise<CancelResult> {
  const result: CancelResult = { stripeRefunded: false, boxtalCancelled: false, boxtalError: null }

  if (order.stripe_checkout_session_id && order.status !== 'pending_payment') {
    const session = await stripe.checkout.sessions.retrieve(
      order.stripe_checkout_session_id,
      { expand: ['payment_intent'] }
    )
    const pi = session.payment_intent
    if (pi && typeof pi === 'object' && pi.status === 'succeeded') {
      await stripe.refunds.create({ payment_intent: pi.id })
      result.stripeRefunded = true
    }
  }

  if (order.boxtal_order_id) {
    try {
      await cancelBoxtalShipment(order.boxtal_order_id)
      result.boxtalCancelled = true
    } catch (e) {
      result.boxtalError = e instanceof Error ? e.message : String(e)
      console.error('[cancel] Annulation Boxtal impossible:', result.boxtalError)
    }
  }

  return result
}
