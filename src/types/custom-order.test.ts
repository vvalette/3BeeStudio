import { describe, it, expect } from 'vitest'
import { computeBalance, paymentState, type CustomOrder } from './custom-order'

/** Demande type : devis de 35 €, acompte de 17,50 €. */
function order(overrides: Partial<CustomOrder> = {}): CustomOrder {
  return {
    status: 'quote_sent',
    deposit_amount: 1750,
    deposit_paid_at: null,
    total_amount: 3500,
    balance_amount: null,
    balance_paid_at: null,
    ...overrides,
  } as CustomOrder
}

describe('computeBalance', () => {
  it('déduit le solde du total moins l’acompte', () => {
    expect(computeBalance(order())).toBe(1750)
  })

  it('donne la priorité au montant réclamé si l’admin l’a ajusté', () => {
    expect(computeBalance(order({ balance_amount: 2000 }))).toBe(2000)
  })

  it('ne renvoie rien quand l’acompte couvre tout', () => {
    expect(computeBalance(order({ deposit_amount: 3500 }))).toBeNull()
  })
})

describe('paymentState', () => {
  it('ne compte rien tant que l’acompte n’est pas encaissé', () => {
    const pay = paymentState(order())
    expect(pay.depositPaid).toBe(false)
    expect(pay.amountPaid).toBe(0)
    expect(pay.fullyPaid).toBe(false)
  })

  it('compte l’acompte encaissé et annonce le reste', () => {
    const pay = paymentState(order({ status: 'in_production', deposit_paid_at: '2026-08-16T12:00:00Z' }))
    expect(pay.depositPaid).toBe(true)
    expect(pay.amountPaid).toBe(1750)
    expect(pay.outstanding).toBe(1750)
    expect(pay.fullyPaid).toBe(false)
  })

  it('déduit l’acompte du statut sur les demandes sans horodatage', () => {
    // Demandes réglées avant la migration 035 : le statut fait foi, la date manque.
    const pay = paymentState(order({ status: 'deposit_paid' }))
    expect(pay.depositPaid).toBe(true)
    expect(pay.depositPaidAt).toBeNull()
    expect(pay.amountPaid).toBe(1750)
  })

  it('solde encaissé → soldé, plus rien à réclamer', () => {
    const pay = paymentState(order({
      status: 'shipped',
      deposit_paid_at: '2026-08-16T12:00:00Z',
      balance_amount: 1750,
      balance_paid_at: '2026-08-21T09:00:00Z',
    }))
    expect(pay.amountPaid).toBe(3500)
    expect(pay.fullyPaid).toBe(true)
    expect(pay.outstanding).toBeNull()
  })

  it('devis réglé en une fois : soldé dès l’acompte', () => {
    const pay = paymentState(order({ status: 'deposit_paid', deposit_amount: 3500 }))
    expect(pay.fullyPaid).toBe(true)
    expect(pay.outstanding).toBeNull()
    expect(pay.amountPaid).toBe(3500)
  })

  it('demande sans devis : rien d’encaissé, rien de soldé', () => {
    const pay = paymentState(order({ status: 'pending_quote', deposit_amount: null, total_amount: null }))
    expect(pay.depositPaid).toBe(false)
    expect(pay.fullyPaid).toBe(false)
    expect(pay.amountPaid).toBe(0)
  })
})
