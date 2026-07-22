'use client'

import { useEffect } from 'react'

// Boundary d'erreur de la section admin (FR uniquement) — la nav admin reste montée.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin-error-boundary]', error)
  }, [error])

  return (
    <div className="flex min-h-[calc(100dvh-72px)] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Erreur admin</p>
        <h1 className="mt-4 text-2xl font-bold text-ink-0">Une erreur est survenue</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          Le chargement de cette page admin a échoué. Réessayez — si le problème persiste,
          vérifiez les logs Vercel.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-ink-3">ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-8 inline-flex cursor-pointer items-center justify-center rounded-pill px-6 py-3 text-sm font-semibold text-white"
          style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
