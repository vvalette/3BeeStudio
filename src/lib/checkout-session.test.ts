import { describe, it, expect, vi, beforeEach } from 'vitest'
import Stripe from 'stripe'

const sessions = vi.hoisted(() => ({
  retrieve: vi.fn(),
  expire:   vi.fn(async () => ({})),
}))
vi.mock('@/lib/stripe', () => ({ stripe: { checkout: { sessions } } }))

import { closePreviousCheckout } from './checkout-session'

beforeEach(() => {
  sessions.retrieve.mockReset()
  sessions.expire.mockClear()
})

describe('closePreviousCheckout', () => {
  it('sans session précédente : rien à fermer', async () => {
    expect(await closePreviousCheckout(null)).toBe('closed')
    expect(sessions.retrieve).not.toHaveBeenCalled()
  })

  it('lien encore ouvert : il est expiré', async () => {
    sessions.retrieve.mockResolvedValue({ status: 'open' })
    expect(await closePreviousCheckout('cs_old')).toBe('closed')
    expect(sessions.expire).toHaveBeenCalledWith('cs_old')
  })

  it('lien déjà expiré : rien à faire', async () => {
    sessions.retrieve.mockResolvedValue({ status: 'expired' })
    expect(await closePreviousCheckout('cs_old')).toBe('closed')
    expect(sessions.expire).not.toHaveBeenCalled()
  })

  it('lien déjà payé : signalé, pas expiré', async () => {
    sessions.retrieve.mockResolvedValue({ status: 'complete' })
    expect(await closePreviousCheckout('cs_old')).toBe('paid')
    expect(sessions.expire).not.toHaveBeenCalled()
  })

  it('session inconnue du compte : considérée fermée', async () => {
    sessions.retrieve.mockRejectedValue(new Stripe.errors.StripeInvalidRequestError({
      type: 'invalid_request_error', code: 'resource_missing', message: 'No such checkout.session',
    }))
    expect(await closePreviousCheckout('cs_test_in_live')).toBe('closed')
  })

  it('Stripe injoignable : l’erreur remonte (pas de nouveau lien à côté de l’ancien)', async () => {
    sessions.retrieve.mockRejectedValue(new Error('network'))
    await expect(closePreviousCheckout('cs_old')).rejects.toThrow('network')
  })
})
