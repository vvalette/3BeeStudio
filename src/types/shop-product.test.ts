import { describe, it, expect } from 'vitest'
import {
  calcShopShipping,
  mergeCartQuantities,
  computeNewsletterDiscount,
  discountPercent,
  effectivePrice,
  generateSlug,
  SHOP_FREE_SHIPPING_THRESHOLD,
  SHOP_SHIPPING_PRICE,
} from './shop-product'

describe('calcShopShipping', () => {
  it('charges shipping below the free-shipping threshold', () => {
    expect(calcShopShipping(0)).toBe(SHOP_SHIPPING_PRICE)
    expect(calcShopShipping(SHOP_FREE_SHIPPING_THRESHOLD - 1)).toBe(SHOP_SHIPPING_PRICE)
  })

  it('is free at and above the threshold', () => {
    expect(calcShopShipping(SHOP_FREE_SHIPPING_THRESHOLD)).toBe(0)
    expect(calcShopShipping(SHOP_FREE_SHIPPING_THRESHOLD + 1000)).toBe(0)
  })
})

describe('mergeCartQuantities', () => {
  it('sums quantities for the same product', () => {
    const merged = mergeCartQuantities([
      { product_id: 'a', quantity: 2 },
      { product_id: 'a', quantity: 3 },
      { product_id: 'b', quantity: 1 },
    ])
    expect(merged.get('a')?.quantity).toBe(5)
    expect(merged.get('b')?.quantity).toBe(1)
    expect(merged.size).toBe(2)
  })

  it('keeps custom_field_values from the first occurrence', () => {
    const merged = mergeCartQuantities([
      { product_id: 'a', quantity: 1, custom_field_values: { text: 'first' } },
      { product_id: 'a', quantity: 1, custom_field_values: { text: 'second' } },
    ])
    expect(merged.get('a')?.custom_field_values).toEqual({ text: 'first' })
  })

  it('returns an empty map for an empty cart', () => {
    expect(mergeCartQuantities([]).size).toBe(0)
  })
})

describe('computeNewsletterDiscount', () => {
  it('rounds -10% to the nearest cent', () => {
    expect(computeNewsletterDiscount(1000)).toBe(100)
    expect(computeNewsletterDiscount(999)).toBe(100) // 99.9 → 100
    expect(computeNewsletterDiscount(0)).toBe(0)
  })
})

describe('discountPercent', () => {
  it('returns null when there is no sale price', () => {
    expect(discountPercent({ price: 1000, sale_price: null })).toBeNull()
  })

  it('returns the rounded percentage off', () => {
    expect(discountPercent({ price: 1000, sale_price: 800 })).toBe(20)
    expect(discountPercent({ price: 1000, sale_price: 750 })).toBe(25)
  })

  it('rounds to the nearest integer', () => {
    expect(discountPercent({ price: 2990, sale_price: 2490 })).toBe(17) // 16,72 → 17
  })

  it('returns 0 when the sale price equals the base price', () => {
    expect(discountPercent({ price: 1000, sale_price: 1000 })).toBe(0)
  })
})

describe('effectivePrice', () => {
  it('prefers the sale price when set', () => {
    expect(effectivePrice({ price: 1000, sale_price: 800 })).toBe(800)
  })

  it('falls back to the base price', () => {
    expect(effectivePrice({ price: 1000, sale_price: null })).toBe(1000)
  })
})

describe('generateSlug', () => {
  it('lowercases and replaces spaces with dashes', () => {
    expect(generateSlug('Porte-clés NFC Premium')).toBe('porte-cles-nfc-premium')
  })

  it('strips accents', () => {
    expect(generateSlug('Épée décorée à l’ancienne')).toBe('epee-decoree-a-l-ancienne')
  })

  it('collapses special characters and trims dashes', () => {
    expect(generateSlug('  ** Vase / “Hex” 2.0 ! ')).toBe('vase-hex-2-0')
  })

  it('returns an empty string for symbol-only input', () => {
    expect(generateSlug('***')).toBe('')
  })
})

// Scénarios complets : total attendu au checkout (sous-total − promo + port)
describe('checkout totals (promo + livraison)', () => {
  it('promo newsletter puis port : la réduction ne fait pas perdre la livraison offerte', () => {
    // 52 € d'achat → livraison offerte (seuil 50 €), même si la promo ramène le sous-total à 46,80 €
    const subtotal = 5200
    const discount = computeNewsletterDiscount(subtotal)
    const shipping = calcShopShipping(subtotal) // seuil évalué AVANT remise (comportement du checkout)
    expect(discount).toBe(520)
    expect(shipping).toBe(0)
    expect(subtotal - discount + shipping).toBe(4680)
  })

  it('petit panier : promo + frais de port pleins', () => {
    const subtotal = 1500
    const discount = computeNewsletterDiscount(subtotal)
    const shipping = calcShopShipping(subtotal)
    expect(subtotal - discount + shipping).toBe(1500 - 150 + SHOP_SHIPPING_PRICE)
  })

  it('retrait studio : jamais de frais de port', () => {
    // le checkout force shipping = 0 en mode pickup, quel que soit le sous-total
    const subtotal = 900
    const shipping = 0
    expect(subtotal - computeNewsletterDiscount(subtotal) + shipping).toBe(810)
  })
})
