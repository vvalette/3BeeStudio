import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { cancelBoxtalShipment } from '@/lib/boxtal'
import type { ShopOrder } from '@/types/shop-order'

export interface CancelResult {
  stripeRefunded: boolean
  /** Le paiement était déjà remboursé côté Stripe (remboursement fait à la main
   *  dans le dashboard). Ce n'est pas une erreur : rien à rembourser de plus. */
  stripeAlreadyRefunded: boolean
  boxtalCancelled: boolean
  boxtalError: string | null
}

/** Stripe refuse un remboursement sur une charge déjà intégralement remboursée. */
function isAlreadyRefundedError(e: unknown): boolean {
  return (
    e instanceof Stripe.errors.StripeInvalidRequestError &&
    (e.code === 'charge_already_refunded' || /already been refunded/i.test(e.message ?? ''))
  )
}

// Rembourse Stripe + annule Boxtal pour une commande boutique.
// N'écrit PAS en base — le appelant décide de supprimer ou de passer en cancelled.
export async function refundAndCancelShipment(order: ShopOrder): Promise<CancelResult> {
  const result: CancelResult = {
    stripeRefunded: false,
    stripeAlreadyRefunded: false,
    boxtalCancelled: false,
    boxtalError: null,
  }

  if (order.stripe_checkout_session_id && order.status !== 'pending_payment') {
    const session = await stripe.checkout.sessions.retrieve(
      order.stripe_checkout_session_id,
      { expand: ['payment_intent.latest_charge'] }
    )
    const pi = session.payment_intent
    if (pi && typeof pi === 'object' && pi.status === 'succeeded') {
      const charge = pi.latest_charge
      const fullyRefunded =
        charge != null &&
        typeof charge === 'object' &&
        (charge.refunded || (charge.amount_captured > 0 && charge.amount_refunded >= charge.amount_captured))

      if (fullyRefunded) {
        result.stripeAlreadyRefunded = true
      } else {
        try {
          await stripe.refunds.create({ payment_intent: pi.id })
          result.stripeRefunded = true
        } catch (e) {
          // Remboursement passé à la main entre-temps : on n'a plus rien à faire,
          // la commande peut être annulée ou supprimée sans bloquer l'admin.
          if (!isAlreadyRefundedError(e)) throw e
          result.stripeAlreadyRefunded = true
        }
      }
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
