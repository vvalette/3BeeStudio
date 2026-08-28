import { describe, it, expect, vi } from 'vitest'

// `@/lib/seo` tire `@/i18n/navigation`, donc next-intl et `next/navigation`, qui
// ne se résout pas hors d'un rendu Next. `schema.ts` ne lui prend que SITE_URL.
vi.mock('@/lib/seo', () => ({ SITE_URL: 'https://3beestudio.fr' }))

import { shopProductSchema, breadcrumbSchema, itemListSchema } from './schema'

const base = {
  name:        'Vase Hexagone',
  description: 'Vase imprimé en PLA, finition mate.',
  images:      ['https://img.example/vase.jpg'],
  url:         'https://3beestudio.fr/boutique/vase-hexagone',
  sku:         '11111111-1111-1111-1111-111111111111',
  priceCents:  2400,
  stock:       5,
  digital:     false,
}

type Offer = {
  price: string
  priceCurrency: string
  availability: string
  shippingDetails?: { shippingRate: { value: string } }
  hasMerchantReturnPolicy: { returnPolicyCategory: string; merchantReturnDays?: number }
}
const offerOf = (p: ReturnType<typeof shopProductSchema>) => p.offers as unknown as Offer

describe('shopProductSchema', () => {
  it('annonce le prix en euros, pas en centimes', () => {
    // Google lit `price` comme un décimal : 2400 y serait compris comme 2400 €.
    expect(offerOf(shopProductSchema(base)).price).toBe('24.00')
    expect(offerOf(shopProductSchema(base)).priceCurrency).toBe('EUR')
  })

  it('déclare la rupture de stock', () => {
    expect(offerOf(shopProductSchema({ ...base, stock: 0 })).availability)
      .toBe('https://schema.org/OutOfStock')
  })

  it('traite un stock illimité comme disponible', () => {
    // stock null = pièce imprimée à la commande : elle n'est jamais en rupture.
    expect(offerOf(shopProductSchema({ ...base, stock: null })).availability)
      .toBe('https://schema.org/InStock')
  })

  it('déclare les frais de port sur un objet, jamais sur un fichier', () => {
    const physical = offerOf(shopProductSchema(base))
    expect(physical.shippingDetails?.shippingRate.value).toBe('3.90')

    const digital = offerOf(shopProductSchema({ ...base, digital: true, stock: null }))
    expect(digital.shippingDetails).toBeUndefined()
  })

  it('exclut le fichier numérique du droit de rétractation, comme les CGV', () => {
    // Le client y renonce expressément au checkout (art. L221-28 3°) : annoncer
    // 14 jours de retour à Google contredirait les CGV et le formulaire.
    expect(offerOf(shopProductSchema({ ...base, digital: true })).hasMerchantReturnPolicy.returnPolicyCategory)
      .toBe('https://schema.org/MerchantReturnNotPermitted')

    const physical = offerOf(shopProductSchema(base)).hasMerchantReturnPolicy
    expect(physical.returnPolicyCategory).toBe('https://schema.org/MerchantReturnFiniteReturnWindow')
    expect(physical.merchantReturnDays).toBe(14)
  })

  it('ne pose ni note ni avis', () => {
    // Décision assumée (docs/project/08-strategie-seo.md) : sans avis clients
    // par produit affichés sur la fiche, baliser une note serait du balisage
    // trompeur — sanctionné bien plus lourdement qu'un champ manquant.
    const schema = shopProductSchema(base) as Record<string, unknown>
    expect(schema.aggregateRating).toBeUndefined()
    expect(schema.review).toBeUndefined()
  })

  it('omet les champs vides plutôt que de les poser à null', () => {
    const schema = shopProductSchema({ ...base, description: null, images: [] }) as Record<string, unknown>
    expect('description' in schema).toBe(false)
    expect('image' in schema).toBe(false)
  })
})

describe('breadcrumbSchema', () => {
  it('numérote les niveaux à partir de 1', () => {
    const ld = breadcrumbSchema([
      { name: 'Boutique', url: 'https://3beestudio.fr/boutique' },
      { name: 'Vase Hexagone', url: base.url },
    ])
    expect(ld.itemListElement.map((i) => i.position)).toEqual([1, 2])
    expect(ld.itemListElement[1].item).toBe(base.url)
  })
})

describe('itemListSchema', () => {
  it('compte les fiches listées', () => {
    const ld = itemListSchema('Boutique', ['https://a', 'https://b', 'https://c'])
    expect(ld.numberOfItems).toBe(3)
    expect(ld.itemListElement[2].position).toBe(3)
  })
})
