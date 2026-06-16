import { SITE_URL } from '@/lib/seo'

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
      // Prix au porte-clé (dégressif selon le volume) — cf. getUnitPrice()
      lowPrice: '1.70',
      highPrice: '2.90',
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
