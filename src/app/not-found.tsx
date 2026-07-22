import Link from 'next/link'
import type { Route } from 'next'
import '@/styles/globals.css'

// 404 racine — couvre les URL hors [locale] et hors admin (le layout racine est
// pass-through, cette page rend donc son propre <html>). FR uniquement : les URL
// publiques localisées passent par [locale]/not-found.tsx.
export default function RootNotFound() {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <div className="flex min-h-dvh items-center justify-center px-6">
          <div className="max-w-md text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">404</p>
            <h1 className="mt-4 text-3xl font-bold text-ink-0">Page introuvable</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-2">
              Cette page n&apos;existe pas ou a été déplacée.
            </p>
            {/* `as Route` : "/" n'est pas une route littérale (le middleware la réécrit en /fr) */}
            <Link
              href={'/' as Route}
              className="mt-8 inline-flex cursor-pointer items-center justify-center rounded-pill px-6 py-3 text-sm font-semibold text-white"
              style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
