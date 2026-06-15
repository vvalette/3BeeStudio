import type { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'
import { getPathname } from '@/i18n/navigation'
import { SITE_URL } from '@/lib/seo'

/**
 * Sitemap dynamique — DOIT rester à la racine `src/app/` (pas sous `[locale]`),
 * sinon le middleware next-intl préfixe l'URL et casse `/sitemap.xml`.
 *
 * Chaque page publique est déclarée avec ses alternates FR/EN (hreflang).
 * Les pages privées (/admin, /suivi, /custom/[id]) sont volontairement absentes
 * et bloquées par robots.ts + noindex.
 */
type Entry = {
  href: string
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  priority: number
}

const PAGES: Entry[] = [
  { href: '/', changeFrequency: 'weekly', priority: 1.0 },
  { href: '/nfc', changeFrequency: 'weekly', priority: 0.9 },
  { href: '/custom', changeFrequency: 'monthly', priority: 0.8 },
  { href: '/cgv', changeFrequency: 'yearly', priority: 0.3 },
  { href: '/mentions-legales', changeFrequency: 'yearly', priority: 0.3 },
  { href: '/politique-de-confidentialite', changeFrequency: 'yearly', priority: 0.3 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return PAGES.map(({ href, changeFrequency, priority }) => {
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
  })
}
