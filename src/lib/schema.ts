import { SITE_URL } from '@/lib/seo'
import { SHOP_RELAY_SHIPPING_PRICE } from '@/types/shop-product'

/**
 * Données structurées Schema.org (JSON-LD).
 * Données « business » réelles (micro-entreprise) — sources : pages légales.
 */

const BUSINESS_ID = `${SITE_URL}/#business`
const LOGO_URL = `${SITE_URL}/images/logo.png`

/** Identité de l'entreprise — affichée sur la page d'accueil. */
export function localBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': BUSINESS_ID,
    name: '3BeeStudio',
    url: SITE_URL,
    email: 'contact@3beestudio.fr',
    logo: LOGO_URL,
    image: LOGO_URL,
    description:
      "Studio d'impression 3D français. Porte-clés NFC personnalisés (B2B), objets de série et créations sur-mesure, fabriqués en France.",
    founder: { '@type': 'Person', name: 'Valentin Valette' },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '144 rue de la République',
      postalCode: '69220',
      addressLocality: 'Belleville-en-Beaujolais',
      addressRegion: 'Auvergne-Rhône-Alpes',
      addressCountry: 'FR',
    },
    areaServed: { '@type': 'Country', name: 'France' },
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'SIRET',
      value: '93141955000039',
    },
    priceRange: '€€',
  }
}

/** Produit phare NFC — affiché sur /nfc. `description` localisée. */
export function nfcProductSchema(name: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: LOGO_URL,
    brand: { '@type': 'Brand', name: '3BeeStudio' },
    category: 'Porte-clés NFC personnalisés',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      // Prix au porte-clé, dégressif par palier de quantité : voir getUnitPrice()
      // dans src/types/order.ts. `offerCount` = le nombre de paliers, soit bien
      // le nombre d'offres agrégées ici ; Search Console le réclame sur tout
      // AggregateOffer. À tenir à jour si un palier bouge.
      lowPrice: '1.70',
      highPrice: '2.90',
      offerCount: 6,
      availability: 'https://schema.org/InStock',
      seller: { '@id': BUSINESS_ID },
      areaServed: { '@type': 'Country', name: 'France' },
    },
  }
}

/**
 * FAQ structurée. ⚠️ Le texte DOIT être identique à celui affiché à l'écran
 * (exigence Google), donc construit depuis les mêmes traductions.
 */
export function faqPageSchema(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }
}

/* ── Boutique ─────────────────────────────────────────────────────────────── */

/**
 * Fiche produit de la boutique.
 *
 * Ce sont les vraies pages produit du site (prix, stock, photos), et elles
 * n'étaient pas balisées : seules `/` et `/nfc` l'étaient. C'est pourtant ici
 * que les résultats enrichis Google ont le plus d'effet, puisqu'ils affichent le
 * prix et la disponibilité directement dans la page de résultats.
 *
 * `review` et `aggregateRating` restent volontairement absents : un avis balisé
 * doit porter sur CE produit et son texte être visible sur la page. Emprunter
 * les témoignages du studio serait du balisage trompeur, sanctionné bien plus
 * lourdement qu'un champ facultatif manquant (cf. docs/project/08-strategie-seo.md).
 */
export function shopProductSchema(input: {
  name: string
  description: string | null
  /** URLs absolues des photos du produit. */
  images: string[]
  /** URL canonique de la fiche, absolue. */
  url: string
  /** Identifiant interne, sert de SKU. */
  sku: string
  /** Prix effectif en centimes (promo comprise). */
  priceCents: number
  /** `null` = fabriqué à la demande, donc jamais en rupture. */
  stock: number | null
  /** Un fichier ne s'expédie pas et n'ouvre pas de droit de rétractation. */
  digital: boolean
}) {
  const available = input.digital || input.stock === null || input.stock > 0

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.images.length > 0 ? { image: input.images } : {}),
    sku: input.sku,
    brand: { '@type': 'Brand', name: '3BeeStudio' },
    offers: {
      '@type': 'Offer',
      url: input.url,
      priceCurrency: 'EUR',
      // Google veut un nombre décimal, pas des centimes.
      price: (input.priceCents / 100).toFixed(2),
      availability: available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': BUSINESS_ID },
      ...(input.digital ? {} : { shippingDetails: shippingDetails() }),
      hasMerchantReturnPolicy: returnPolicy(input.digital),
    },
  }
}

/**
 * Frais et délais de livraison déclarés à Google.
 *
 * Tarif : celui du point relais (3,90 €), le moins cher et le mode proposé par
 * défaut au checkout — la fiche produit annonce déjà ce montant-là.
 *
 * Délais : décomposition du « 3 à 7 jours » affiché sur la fiche et repris par
 * Stripe. La préparation vient des CGV (article 5 : expédition sous 2 à 5 jours
 * ouvrés), le transport est le délai transporteur restant. Les deux bornes
 * s'additionnent donc bien en 3 à 7 jours.
 */
function shippingDetails() {
  return {
    '@type': 'OfferShippingDetails',
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: (SHOP_RELAY_SHIPPING_PRICE / 100).toFixed(2),
      currency: 'EUR',
    },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'FR' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 5, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 2, unitCode: 'DAY' },
    },
  }
}

/**
 * Politique de retour, telle qu'elle est écrite dans les CGV (article 6).
 *
 * Un fichier téléchargeable en est exclu : le client renonce expressément à son
 * droit de rétractation au checkout (art. L221-28 3°), sans quoi la commande est
 * refusée côté serveur. Le déclarer autrement ici contredirait les CGV.
 */
function returnPolicy(digital: boolean) {
  if (digital) {
    return {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: 'FR',
      returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
    }
  }
  return {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'FR',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 14,
    returnMethod: 'https://schema.org/ReturnByMail',
    // Les frais de retour sont à la charge du client (CGV article 6).
    returnFees: 'https://schema.org/ReturnShippingFees',
  }
}

/**
 * Fil d'Ariane. Le même que celui affiché en haut de la fiche produit : Google
 * exige que le balisage corresponde à ce que voit le visiteur.
 */
export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

/**
 * Liste du catalogue. Aide Google à comprendre que `/boutique` est une page de
 * listing et à rattacher les fiches entre elles, plutôt que de les découvrir une
 * par une par le sitemap.
 */
export function itemListSchema(name: string, urls: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: urls.length,
    itemListElement: urls.map((url, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url,
    })),
  }
}
