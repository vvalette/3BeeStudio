'use client'

import '@/styles/globals.css'

// Dernier filet de sécurité — remplace tout le layout (y compris <html>) quand un
// layout lui-même crashe. Volontairement minimal et sans dépendances.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <div className="flex min-h-dvh items-center justify-center px-6">
          <div className="max-w-md text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Erreur</p>
            <h1 className="mt-4 text-3xl font-bold text-ink-0">Une erreur est survenue</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              Un problème inattendu s&apos;est produit. Réessayez, ou revenez plus tard.
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
      </body>
    </html>
  )
}
