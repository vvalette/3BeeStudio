import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['fr', 'en'] as const,
  defaultLocale: 'fr',
  localePrefix: 'as-needed', // FR → /, EN → /en/
})

export type Locale = (typeof routing.locales)[number]
