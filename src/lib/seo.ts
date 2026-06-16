import type { Metadata } from 'next'
import { routing, type Locale } from '@/i18n/routing'
import { getPathname } from '@/i18n/navigation'

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'

/**
 * Construit les `alternates` (canonical + hreflang) d'une page pour Google.
 *
 * Respecte `localePrefix: 'as-needed'` :
 *   - FR (défaut) → https://3beestudio.fr/nfc
 *   - EN          → https://3beestudio.fr/en/nfc
 *
 * `href` est le chemin interne SANS préfixe de langue (ex. '/nfc', '/').
 */
export function buildAlternates(href: string, locale: Locale): Metadata['alternates'] {
  const languages: Record<string, string> = {}
  for (const l of routing.locales) {
    languages[l] = SITE_URL + getPathname({ href, locale: l })
  }
  // x-default pointe vers la version par défaut (FR)
  languages['x-default'] = SITE_URL + getPathname({ href, locale: routing.defaultLocale })

  return {
    canonical: SITE_URL + getPathname({ href, locale }),
    languages,
  }
}
