'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'

// Lit les searchParams côté client pour garder la page /boutique statique (ISR) :
// un searchParam lu côté serveur forcerait le rendu dynamique de toute la route.
//
// Deux retours atterrissent ici :
//   ?cancelled=true  → paiement Stripe abandonné (cancel_url du checkout)
//   ?relance=stop    → désinscription des relances de panier confirmée
export default function CancelBanner() {
  const params = useSearchParams()
  const t = useTranslations('boutique.page')

  const cancelled = params.get('cancelled') === 'true'
  const optedOut  = params.get('relance') === 'stop'

  if (!cancelled && !optedOut) return null

  return (
    <div className="mb-6 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber text-center">
      {cancelled ? t('cancelBanner') : t('reminderOptOutBanner')}
    </div>
  )
}
