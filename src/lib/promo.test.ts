import { describe, it, expect } from 'vitest'
import {
  checkPromo,
  promoBase,
  promoLabel,
  promoIsSpent,
  normalizeCode,
  discountLabel,
  promoReplacesNewsletter,
  type CartAmounts,
} from './promo'
import type { PromoCode } from '@/types/promo'

const NOW = new Date('2026-08-24T12:00:00Z')

function promo(over: Partial<PromoCode> = {}): PromoCode {
  return {
    id: 'p1', created_at: '', updated_at: '',
    code: 'TEST', type: 'percent', value: 10,
    active: true, starts_at: null, ends_at: null,
    max_uses: null, uses: 0,
    once_per_email: false, min_subtotal: 0, applies_to: 'all', note: null,
    ...over,
  }
}

const cart: CartAmounts = {
  subtotal: 10000, physicalSubtotal: 6000, digitalSubtotal: 4000, hasPhysical: true,
}

describe('checkPromo — calcul', () => {
  it('applique un pourcentage sur le panier', () => {
    expect(checkPromo(promo({ type: 'percent', value: 10 }), cart, NOW))
      .toEqual({ ok: true, discount: 1000, freeShipping: false })
  })

  it('applique un montant fixe', () => {
    expect(checkPromo(promo({ type: 'amount', value: 500 }), cart, NOW))
      .toEqual({ ok: true, discount: 500, freeShipping: false })
  })

  // Sans plafond, un code « 50 € offerts » sur un panier à 30 € rendrait de l'argent.
  it('plafonne un montant fixe à la part concernée', () => {
    const petit: CartAmounts = { subtotal: 3000, physicalSubtotal: 3000, digitalSubtotal: 0, hasPhysical: true }
    expect(checkPromo(promo({ type: 'amount', value: 5000 }), petit, NOW))
      .toEqual({ ok: true, discount: 3000, freeShipping: false })
  })

  it('offre la livraison sans toucher au sous-total', () => {
    expect(checkPromo(promo({ type: 'free_shipping' }), cart, NOW))
      .toEqual({ ok: true, discount: 0, freeShipping: true })
  })

  it('restreint la remise aux objets ou aux fichiers', () => {
    expect(checkPromo(promo({ applies_to: 'physical', value: 10 }), cart, NOW))
      .toEqual({ ok: true, discount: 600, freeShipping: false })
    expect(checkPromo(promo({ applies_to: 'digital', value: 10 }), cart, NOW))
      .toEqual({ ok: true, discount: 400, freeShipping: false })
  })
})

describe('checkPromo — refus', () => {
  it('refuse un code inconnu ou désactivé', () => {
    expect(checkPromo(null, cart, NOW)).toEqual({ ok: false, reason: 'introuvable' })
    expect(checkPromo(promo({ active: false }), cart, NOW)).toEqual({ ok: false, reason: 'inactif' })
  })

  it('respecte la fenêtre de validité', () => {
    expect(checkPromo(promo({ starts_at: '2026-09-01T00:00:00Z' }), cart, NOW))
      .toEqual({ ok: false, reason: 'pas_encore' })
    expect(checkPromo(promo({ ends_at: '2026-08-01T00:00:00Z' }), cart, NOW))
      .toEqual({ ok: false, reason: 'expire' })
    // Le jour de fin est inclus : un code jusqu'au 24 doit marcher le 24.
    expect(checkPromo(promo({ ends_at: '2026-08-24T23:59:59Z' }), cart, NOW).ok).toBe(true)
  })

  it('refuse un code épuisé', () => {
    expect(checkPromo(promo({ max_uses: 5, uses: 5 }), cart, NOW)).toEqual({ ok: false, reason: 'epuise' })
    expect(checkPromo(promo({ max_uses: 5, uses: 4 }), cart, NOW).ok).toBe(true)
  })

  it('applique le minimum de commande au panier entier', () => {
    expect(checkPromo(promo({ min_subtotal: 15000 }), cart, NOW)).toEqual({ ok: false, reason: 'minimum' })
    expect(checkPromo(promo({ min_subtotal: 10000 }), cart, NOW).ok).toBe(true)
  })

  // Offrir la livraison sur un panier de fichiers n'a aucun effet : autant le dire.
  it('refuse la livraison gratuite sans rien à expédier', () => {
    const fichiers: CartAmounts = { subtotal: 4000, physicalSubtotal: 0, digitalSubtotal: 4000, hasPhysical: false }
    expect(checkPromo(promo({ type: 'free_shipping' }), fichiers, NOW))
      .toEqual({ ok: false, reason: 'rien_a_livrer' })
  })

  it('refuse un code ciblé sur une part absente du panier', () => {
    const fichiers: CartAmounts = { subtotal: 4000, physicalSubtotal: 0, digitalSubtotal: 4000, hasPhysical: false }
    expect(checkPromo(promo({ applies_to: 'physical' }), fichiers, NOW))
      .toEqual({ ok: false, reason: 'panier_incompatible' })
  })
})

describe('cumul avec la newsletter', () => {
  it('remplace la remise newsletter sauf pour la livraison gratuite', () => {
    expect(promoReplacesNewsletter(promo({ type: 'percent' }))).toBe(true)
    expect(promoReplacesNewsletter(promo({ type: 'amount' }))).toBe(true)
    expect(promoReplacesNewsletter(promo({ type: 'free_shipping' }))).toBe(false)
  })
})

describe('helpers', () => {
  it('normalise la saisie du client', () => {
    expect(normalizeCode('  bienvenue10 ')).toBe('BIENVENUE10')
  })

  it('libelle chaque type', () => {
    expect(promoLabel({ type: 'percent', value: 10 })).toBe('−10 %')
    expect(promoLabel({ type: 'amount', value: 500 })).toBe('−5,00 €')
    expect(promoLabel({ type: 'free_shipping', value: 0 })).toBe('Livraison offerte')
  })

  it('repère un code qui ne sert plus', () => {
    expect(promoIsSpent(promo(), NOW)).toBe(false)
    expect(promoIsSpent(promo({ active: false }), NOW)).toBe(true)
    expect(promoIsSpent(promo({ ends_at: '2026-08-01T00:00:00Z' }), NOW)).toBe(true)
    expect(promoIsSpent(promo({ max_uses: 3, uses: 3 }), NOW)).toBe(true)
  })

  // `discount_amount` est partagé : sans le code, la facture dirait « newsletter ».
  it('libelle la remise selon son origine', () => {
    expect(discountLabel({ promo_code: 'NOEL20' })).toBe('Code NOEL20')
    expect(discountLabel({ promo_code: null })).toBe('Réduction newsletter')
  })

  it('cible la bonne part du panier', () => {
    expect(promoBase(promo({ applies_to: 'all' }), cart)).toBe(10000)
    expect(promoBase(promo({ applies_to: 'physical' }), cart)).toBe(6000)
    expect(promoBase(promo({ applies_to: 'digital' }), cart)).toBe(4000)
  })
})
