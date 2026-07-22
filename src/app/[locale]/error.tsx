'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Eyebrow from '@/components/ui/Eyebrow'

// Boundary d'erreur des pages publiques — le layout (navbar, thème, panier) reste monté.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errorPages')

  useEffect(() => {
    console.error('[error-boundary]', error)
  }, [error])

  return (
    <div className="flex min-h-[calc(100dvh-72px)] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <Eyebrow>Oops</Eyebrow>
        <h1 className="mt-4 text-3xl font-bold text-ink-0 sm:text-4xl">{t('errorTitle')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">{t('errorDesc')}</p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-ink-3">ref: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex cursor-pointer items-center justify-center rounded-pill px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
          >
            {t('retry')}
          </button>
          <Link
            href="/"
            className="inline-flex cursor-pointer items-center justify-center rounded-pill border border-[var(--line)] px-6 py-3 text-sm font-semibold text-ink-1 transition-colors hover:text-ink-0"
          >
            {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
