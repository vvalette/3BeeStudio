import { describe, it, expect } from 'vitest'
import { LOW_STOCK_THRESHOLD, isLowStock, isOutOfStock } from './stock'

describe('isLowStock', () => {
  it('signale le stock au seuil et en dessous', () => {
    expect(isLowStock(0)).toBe(true)
    expect(isLowStock(1)).toBe(true)
    expect(isLowStock(LOW_STOCK_THRESHOLD)).toBe(true)
  })

  it('laisse passer le stock au-dessus du seuil', () => {
    expect(isLowStock(LOW_STOCK_THRESHOLD + 1)).toBe(false)
    expect(isLowStock(50)).toBe(false)
  })

  // `null` = imprimé à la commande : jamais en alerte, sinon toutes les pièces
  // sans compteur de stock déclencheraient le digest hebdomadaire.
  it('ignore le stock illimité', () => {
    expect(isLowStock(null)).toBe(false)
  })
})

describe('isOutOfStock', () => {
  it('ne vaut que pour un stock à zéro', () => {
    expect(isOutOfStock(0)).toBe(true)
    expect(isOutOfStock(1)).toBe(false)
    expect(isOutOfStock(null)).toBe(false)
  })
})
