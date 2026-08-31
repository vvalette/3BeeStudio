import { describe, it, expect } from 'vitest'
import { getUnitPrice, getShipping, calcOrder, PRICE_TIERS, FREE_SHIPPING_QTY, SHIPPING_COST } from './order'

// Le chemin de l'argent : la grille tarifaire publique (/nfc), l'étape quantité et
// la route de commande lisent tous ces fonctions. Un écart ici se facture au client.

describe('getUnitPrice', () => {
  it('applique le palier atteint', () => {
    expect(getUnitPrice(5)).toBe(290)
    expect(getUnitPrice(9)).toBe(290)
    expect(getUnitPrice(10)).toBe(260)
    expect(getUnitPrice(24)).toBe(260)
    expect(getUnitPrice(25)).toBe(240)
    expect(getUnitPrice(50)).toBe(220)
    expect(getUnitPrice(100)).toBe(190)
    expect(getUnitPrice(250)).toBe(170)
    expect(getUnitPrice(10000)).toBe(170)
  })

  it('retombe sur le prix plein sous la quantité minimum', () => {
    expect(getUnitPrice(1)).toBe(290)
  })

  it('reste dégressif sur toute la grille', () => {
    const prices = [...PRICE_TIERS].reverse().map((t) => t.unitPrice)
    expect(prices).toEqual([...prices].sort((a, b) => b - a))
  })
})

describe('getShipping', () => {
  it('facture un port unique en dessous du seuil', () => {
    expect(getShipping(5)).toBe(SHIPPING_COST)
    expect(getShipping(50)).toBe(SHIPPING_COST)
    expect(getShipping(FREE_SHIPPING_QTY - 1)).toBe(SHIPPING_COST)
  })

  it('offre le port à partir du seuil', () => {
    expect(getShipping(FREE_SHIPPING_QTY)).toBe(0)
    expect(getShipping(500)).toBe(0)
  })
})

describe('calcOrder', () => {
  it('additionne sous-total et port', () => {
    expect(calcOrder(50)).toEqual({ unitPrice: 220, subtotal: 11000, shipping: 690, total: 11690 })
  })

  it('ne facture pas de port au-delà du seuil', () => {
    expect(calcOrder(100)).toEqual({ unitPrice: 190, subtotal: 19000, shipping: 0, total: 19000 })
  })
})
