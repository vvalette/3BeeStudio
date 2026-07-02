import { describe, it, expect } from 'vitest'
import {
  calcShopShipping,
  mergeCartQuantities,
  computeNewsletterDiscount,
  discountPercent,
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
})
