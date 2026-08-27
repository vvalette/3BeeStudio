import { describe, it, expect } from 'vitest'
import {
  splitCart,
  resolveDeliveryMode,
  calcShopShipping,
  mergeCartQuantities,
  cartLineKey,
  findProductColor,
  colorLabel,
  computeNewsletterDiscount,
  discountPercent,
  effectivePrice,
  generateSlug,
  SHOP_FREE_SHIPPING_THRESHOLD,
  SHOP_SHIPPING_PRICE,
  SHOP_RELAY_SHIPPING_PRICE,
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

  it('le point relais est moins cher que le domicile', () => {
    expect(calcShopShipping(0, 'relay')).toBe(SHOP_RELAY_SHIPPING_PRICE)
    expect(SHOP_RELAY_SHIPPING_PRICE).toBeLessThan(SHOP_SHIPPING_PRICE)
  })

  it('le retrait studio est toujours gratuit, même sous le seuil', () => {
    expect(calcShopShipping(0, 'pickup')).toBe(0)
    expect(calcShopShipping(100, 'pickup')).toBe(0)
  })

  it('le seuil de gratuité s’applique aussi au relais', () => {
    expect(calcShopShipping(SHOP_FREE_SHIPPING_THRESHOLD, 'relay')).toBe(0)
    expect(calcShopShipping(SHOP_FREE_SHIPPING_THRESHOLD - 1, 'relay')).toBe(SHOP_RELAY_SHIPPING_PRICE)
  })

  it('défaut = livraison à domicile (compat appels existants)', () => {
    expect(calcShopShipping(0)).toBe(calcShopShipping(0, 'delivery'))
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

  it('sépare deux coloris du même produit en deux lignes', () => {
    const merged = mergeCartQuantities([
      { product_id: 'a', quantity: 2, color: 'noir' },
      { product_id: 'a', quantity: 1, color: 'blanc' },
      { product_id: 'a', quantity: 3, color: 'noir' },
    ])
    expect(merged.size).toBe(2)
    expect(merged.get(cartLineKey('a', 'noir'))?.quantity).toBe(5)
    expect(merged.get(cartLineKey('a', 'blanc'))?.quantity).toBe(1)
  })

  it('ne mélange pas une ligne coloris et une ligne sans coloris', () => {
    const merged = mergeCartQuantities([
      { product_id: 'a', quantity: 1 },
      { product_id: 'a', quantity: 1, color: 'noir' },
    ])
    expect(merged.size).toBe(2)
    expect(merged.get('a')?.quantity).toBe(1)
  })
})

describe('cartLineKey', () => {
  it('garde l’id nu sans coloris (paniers et commandes existants inchangés)', () => {
    expect(cartLineKey('abc')).toBe('abc')
    expect(cartLineKey('abc', null)).toBe('abc')
  })

  it('distingue deux coloris du même produit', () => {
    expect(cartLineKey('abc', 'noir')).not.toBe(cartLineKey('abc', 'blanc'))
  })
})

describe('findProductColor', () => {
  const palette = [
    { key: 'noir', label: 'Noir', label_en: 'Black', hex: '#1A1A1C' },
    { key: 'blanc', label: 'Blanc', hex: '#F2F1EC' },
  ]

  it('retrouve un coloris par sa clé', () => {
    expect(findProductColor(palette, 'blanc')?.label).toBe('Blanc')
  })

  it('renvoie null sur une clé absente, vide ou une palette manquante', () => {
    expect(findProductColor(palette, 'turquoise')).toBeNull()
    expect(findProductColor(palette, undefined)).toBeNull()
    expect(findProductColor(undefined, 'noir')).toBeNull()
  })

  it('retombe sur le libellé FR quand l’anglais manque', () => {
    expect(colorLabel(palette[0], 'en')).toBe('Black')
    expect(colorLabel(palette[1], 'en')).toBe('Blanc')
    expect(colorLabel(palette[0], 'fr')).toBe('Noir')
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

describe('splitCart', () => {
  const physical = (price: number, qty = 1) => ({ product_type: 'physical' as const, unit_price: price, quantity: qty })
  const digital  = (price: number, qty = 1) => ({ product_type: 'digital'  as const, unit_price: price, quantity: qty })

  it('sépare les deux parts', () => {
    const s = splitCart([physical(1000, 2), digital(500)])
    expect(s.physicalSubtotal).toBe(2000)
    expect(s.digitalSubtotal).toBe(500)
    expect(s.subtotal).toBe(2500)
    expect(s.hasPhysical).toBe(true)
    expect(s.hasDigital).toBe(true)
  })

  it('détecte un panier 100 % numérique', () => {
    const s = splitCart([digital(300), digital(700, 2)])
    expect(s.hasPhysical).toBe(false)
    expect(s.hasDigital).toBe(true)
    expect(s.physicalSubtotal).toBe(0)
  })

  it('traite un panier vide sans rien casser', () => {
    const s = splitCart([])
    expect(s).toMatchObject({ subtotal: 0, hasPhysical: false, hasDigital: false })
  })
})

describe('calcShopShipping — produits numériques', () => {
  it('ne facture rien en mode digital', () => {
    expect(calcShopShipping(0, 'digital')).toBe(0)
    expect(calcShopShipping(10000, 'digital')).toBe(0)
  })

  // Pas de garde sur un sous-total à 0 ici : le court-circuit appartient aux
  // appelants (CartProvider, CheckoutClient, route checkout), qui testent
  // `hasPhysical` avant d'appeler. Cf. les tests du tarif plein plus haut.

  // Le cas qui coûte de l'argent : 45 € de fichiers + un objet à 5 € ne doivent
  // PAS franchir le seuil de 50 € et offrir le port. D'où le calcul sur la part
  // physique seule.
  it('ne laisse pas des fichiers offrir le port sur un panier mixte', () => {
    const cart = splitCart([
      { product_type: 'digital',  unit_price: 4500, quantity: 1 },
      { product_type: 'physical', unit_price: 500,  quantity: 1 },
    ])
    expect(cart.subtotal).toBeGreaterThanOrEqual(SHOP_FREE_SHIPPING_THRESHOLD)
    expect(calcShopShipping(cart.physicalSubtotal, 'relay')).toBe(SHOP_RELAY_SHIPPING_PRICE)
    // À comparer avec le bug qu'on évite : le seuil serait franchi sur le total.
    expect(calcShopShipping(cart.subtotal, 'relay')).toBe(0)
  })
})

describe('resolveDeliveryMode', () => {
  it('force digital sans article physique', () => {
    expect(resolveDeliveryMode(false, 'relay')).toBe('digital')
    expect(resolveDeliveryMode(false, 'delivery')).toBe('digital')
  })

  it('respecte le choix du client dès qu’il y a un colis', () => {
    expect(resolveDeliveryMode(true, 'pickup')).toBe('pickup')
    expect(resolveDeliveryMode(true, 'relay')).toBe('relay')
  })
})
