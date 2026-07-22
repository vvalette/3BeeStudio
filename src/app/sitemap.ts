import type { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'
import { getPathname } from '@/i18n/navigation'
import { SITE_URL } from '@/lib/seo'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Sitemap dynamique — DOIT rester à la racine `src/app/` (pas sous `[locale]`),
 * sinon le middleware next-intl préfixe l'URL et casse `/sitemap.xml`.
 *
 * Chaque page publique est déclarée avec ses alternates FR/EN (hreflang).
 * Les pages privées (/admin, /suivi, /custom/[id], /boutique/suivi, /boutique/commande)
 * sont volontairement absentes et bloquées par robots.ts + noindex.
 */
type Entry = {
  href: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

const STATIC_PAGES: Entry[] = [
  { href: '/', changeFrequency: 'weekly', priority: 1.0 },
  { href: '/nfc', changeFrequency: 'weekly', priority: 0.9 },
  { href: '/boutique', changeFrequency: 'weekly', priority: 0.9 },
  { href: '/custom', changeFrequency: 'monthly', priority: 0.8 },
  { href: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { href: '/cgv', changeFrequency: 'yearly', priority: 0.3 },
  { href: '/mentions-legales', changeFrequency: 'yearly', priority: 0.3 },
  { href: '/politique-de-confidentialite', changeFrequency: 'yearly', priority: 0.3 },
]

function entry({ href, changeFrequency, priority }: Entry, lastModified: Date): MetadataRoute.Sitemap[number] {
  const languages: Record<string, string> = {}
  for (const locale of routing.locales) {
    languages[locale] = SITE_URL + getPathname({ href, locale })
  }
  return {
    url: SITE_URL + getPathname({ href, locale: routing.defaultLocale }),
    lastModified,
    changeFrequency,
    priority,
    alternates: { languages },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  // Pages produits actives de la boutique
  const { data: products } = await supabaseAdmin
    .from('shop_products')
    .select('slug, updated_at')
    .eq('active', true)

  const productEntries: MetadataRoute.Sitemap = (products ?? []).map((p) => {
    const href = `/boutique/${p.slug}`
    const languages: Record<string, string> = {}
    for (const locale of routing.locales) {
      languages[locale] = SITE_URL + getPathname({ href, locale })
    }
    return {
      url: SITE_URL + getPathname({ href, locale: routing.defaultLocale }),
      lastModified: p.updated_at ? new Date(p.updated_at) : lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: { languages },
    }
  })

  return [
    ...STATIC_PAGES.map((e) => entry(e, lastModified)),
    ...productEntries,
  ]
}
