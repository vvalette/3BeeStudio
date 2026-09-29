import { describe, it, expect } from 'vitest'
import { balanceAnomaly, computeBalance, paymentState, type CustomOrder } from './custom-order'

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

  it('garde un montant réclamé plus bas que le plafond (geste commercial)', () => {
    expect(computeBalance(order({ balance_amount: 1500 }))).toBe(1500)
  })

  it('borne un montant stocké au-delà de total − acompte', () => {
    expect(computeBalance(order({ balance_amount: 2000 }))).toBe(1750)
  })

  it('acompte = total : aucun solde, même si un montant fantôme est stocké', () => {
    expect(computeBalance(order({ deposit_amount: 3500 }))).toBeNull()
    expect(computeBalance(order({ deposit_amount: 3500, balance_amount: 3500 }))).toBeNull()
  })

  it('acompte = 0 ou absent : le solde est le total', () => {
    expect(computeBalance(order({ deposit_amount: 0 }))).toBe(3500)
    expect(computeBalance(order({ deposit_amount: null }))).toBe(3500)
  })

  it('sans total, seul un montant déjà réclamé fait foi', () => {
    expect(computeBalance(order({ total_amount: null }))).toBeNull()
    expect(computeBalance(order({ total_amount: null, balance_amount: 900 }))).toBe(900)
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

describe('paymentState · Reste dû et badge lisent le même chiffre', () => {
  it('acompte = total avec un solde fantôme stocké : soldé, rien à réclamer', () => {
    // Cas réel 79e3707b : total 40 €, acompte 40 €, solde de 40 € enregistré à tort.
    const pay = paymentState(order({
      status: 'delivered', total_amount: 4000, deposit_amount: 4000, balance_amount: 4000,
    }))
    expect(pay.amountPaid).toBe(4000)
    expect(pay.outstanding).toBeNull()
    expect(pay.fullyPaid).toBe(true)
  })

  it('acompte < total encaissé : reste = total − encaissé', () => {
    const pay = paymentState(order({ status: 'in_production', deposit_paid_at: '2026-08-16T12:00:00Z' }))
    expect(pay.outstanding).toBe(3500 - pay.amountPaid)
  })

  it('acompte = 0 : tout le total reste dû', () => {
    const pay = paymentState(order({ status: 'in_production', deposit_amount: 0 }))
    expect(pay.amountPaid).toBe(0)
    expect(pay.outstanding).toBe(3500)
    expect(pay.fullyPaid).toBe(false)
  })
})

describe('balanceAnomaly', () => {
  it('rien à signaler sur une demande cohérente', () => {
    expect(balanceAnomaly(order())).toBeNull()
    expect(balanceAnomaly(order({ balance_amount: 1750, balance_paid_at: '2026-08-21T09:00:00Z', status: 'shipped' }))).toBeNull()
  })

  it('repère un solde stocké alors que l’acompte couvre le total', () => {
    const a = balanceAnomaly(order({ status: 'delivered', deposit_amount: 3500, balance_amount: 3500 }))
    expect(a).toMatchObject({ kind: 'phantom', stored: 3500, cap: 0, paidByStripe: false })
  })

  it('repère un encaissé supérieur au total', () => {
    const a = balanceAnomaly(order({
      status: 'delivered', deposit_amount: 4000, total_amount: 4000,
      balance_amount: 4000, balance_paid_at: '2026-09-29T00:00:00Z', balance_method: 'transfer',
    }))
    expect(a).toMatchObject({ kind: 'overpaid', amountPaid: 8000, paidByStripe: false })
  })

  it('marque un solde réglé par Stripe comme intouchable', () => {
    const a = balanceAnomaly(order({
      status: 'delivered', deposit_amount: 3500,
      balance_amount: 3500, balance_paid_at: '2026-09-29T00:00:00Z', balance_method: 'stripe',
    }))
    expect(a?.paidByStripe).toBe(true)
  })
})
