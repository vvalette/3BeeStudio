'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

// Lit ?cancelled=true côté client pour garder la page /boutique statique (ISR) :
// un searchParam lu côté serveur forcerait le rendu dynamique de toute la route.
export default function CancelBanner() {
  const cancelled = useSearchParams().get('cancelled')
  const t = useTranslations('boutique.page')

  if (cancelled !== 'true') return null

  return (
    <div className="mb-6 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber text-center">
      {t('cancelBanner')}
    </div>
  )
}
