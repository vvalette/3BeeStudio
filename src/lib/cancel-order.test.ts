import { describe, it, expect, vi, beforeEach } from 'vitest'
import Stripe from 'stripe'
import type { ShopOrder } from '@/types/shop-order'

const { retrieveSession, createRefund, cancelBoxtal } = vi.hoisted(() => ({
  retrieveSession: vi.fn(),
  createRefund: vi.fn(),
  cancelBoxtal: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: { sessions: { retrieve: retrieveSession } },
    refunds: { create: createRefund },
  },
}))

vi.mock('@/lib/boxtal', () => ({ cancelBoxtalShipment: cancelBoxtal }))

const { refundAndCancelShipment } = await import('./cancel-order')

function order(): ShopOrder {
  return { id: 'abc', status: 'confirmed', stripe_checkout_session_id: 'cs_1' } as ShopOrder
}

/** Charge Stripe : `refunded` passe à true dès que tout est remboursé. */
function session({ refunded = false, amountRefunded = 0 } = {}) {
  return {
    payment_intent: {
      id: 'pi_1',
      status: 'succeeded',
      latest_charge: { id: 'ch_1', refunded, amount_captured: 2000, amount_refunded: amountRefunded },
    },
  }
}

function alreadyRefundedError() {
  return new Stripe.errors.StripeInvalidRequestError({
    type: 'invalid_request_error',
    code: 'charge_already_refunded',
    message: 'Charge ch_1 has already been refunded.',
  })
}

beforeEach(() => {
  retrieveSession.mockReset().mockResolvedValue(session())
  createRefund.mockReset().mockResolvedValue({ id: 're_1' })
  cancelBoxtal.mockReset().mockResolvedValue(undefined)
})

describe('refundAndCancelShipment', () => {
  it('rembourse un paiement encaissé', async () => {
    const result = await refundAndCancelShipment(order())
    expect(createRefund).toHaveBeenCalledWith({ payment_intent: 'pi_1' })
    expect(result.stripeRefunded).toBe(true)
    expect(result.stripeAlreadyRefunded).toBe(false)
  })

  // Le cas qui compte : remboursement déjà fait à la main dans le dashboard Stripe.
  // Sans ça, la suppression de la commande échouait en 500.
  it('ne redemande pas de remboursement si la charge est déjà remboursée', async () => {
    retrieveSession.mockResolvedValue(session({ refunded: true, amountRefunded: 2000 }))
    const result = await refundAndCancelShipment(order())
    expect(createRefund).not.toHaveBeenCalled()
    expect(result.stripeAlreadyRefunded).toBe(true)
    expect(result.stripeRefunded).toBe(false)
  })

  // Course : la charge paraît remboursable mais Stripe refuse (remboursé entre-temps).
  it('avale l’erreur « charge_already_refunded » de Stripe', async () => {
    createRefund.mockRejectedValue(alreadyRefundedError())
    const result = await refundAndCancelShipment(order())
    expect(result.stripeAlreadyRefunded).toBe(true)
  })

  it('laisse remonter une vraie erreur Stripe', async () => {
    createRefund.mockRejectedValue(new Error('Stripe indisponible'))
    await expect(refundAndCancelShipment(order())).rejects.toThrow('Stripe indisponible')
  })

  it('ne touche pas à Stripe sur une commande non payée', async () => {
    await refundAndCancelShipment({ ...order(), status: 'pending_payment' } as ShopOrder)
    expect(retrieveSession).not.toHaveBeenCalled()
    expect(createRefund).not.toHaveBeenCalled()
  })

  it('n’échoue pas si l’annulation Boxtal casse', async () => {
    cancelBoxtal.mockRejectedValue(new Error('Colis déjà pris en charge'))
    const result = await refundAndCancelShipment({ ...order(), boxtal_order_id: 'bx_1' } as ShopOrder)
    expect(result.stripeRefunded).toBe(true)
    expect(result.boxtalCancelled).toBe(false)
    expect(result.boxtalError).toBe('Colis déjà pris en charge')
  })
})
