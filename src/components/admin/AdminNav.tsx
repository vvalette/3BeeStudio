'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'

// `short` : libellé réduit sur mobile — les 5 libellés complets font ~560 px et
// débordaient la largeur d'écran, ce qui rendait TOUTE la page admin scrollable
// horizontalement (le conteneur nav n'avait ni wrap ni scroll).
const LINKS: { href: Route; label: string; short: string; icon: React.ReactNode }[] = [
  {
    href: '/admin/commandes',
    label: 'Commandes',
    short: 'Commandes',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 5l6-3 6 3v6l-6 3-6-3V5z" /><path d="M2 5l6 3 6-3M8 8v6" />
      </svg>
    ),
  },
  {
    href: '/admin/nfc',
    label: 'Porte-clé NFC',
    short: 'NFC',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="12" height="9" rx="1.5" /><path d="M5.5 4V3a2.5 2.5 0 015 0v1" /><path d="M8 8v2M8 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
      </svg>
    ),
  },
  {
    href: '/admin/sur-mesure',
    label: 'Sur-mesure',
    short: 'Sur-mesure',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.5 2.5l3 3-8 8H2.5v-3l8-8z" /><path d="M8.5 4.5l3 3" />
      </svg>
    ),
  },
  {
    href: '/admin/boutique',
    label: 'Boutique',
    short: 'Boutique',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4h12l-1 8H3L2 4z" /><path d="M5 4l1-2h4l1 2" />
      </svg>
    ),
  },
  {
    href: '/admin/testimonials',
    label: 'Témoignages',
    short: 'Avis',
    icon: (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h12v8H9l-3 3v-3H2V3z" />
      </svg>
    ),
  },
]

export default function AdminNav() {
  const pathname = usePathname()

  // Ne pas afficher sur la page login
  if (pathname === '/admin') return null

  return (
    <div
      className="sticky top-[72px] z-40 border-b border-[var(--line)] bg-bg-0/90 backdrop-blur-md"
    >
      {/* flex-wrap : les 5 entrées ne tiennent pas sur une ligne en 390 px. Elles
          passent sur 2 lignes plutôt que de déborder (ce qui rendait toute la page
          admin scrollable horizontalement) ou d'être masquées par un scroll latéral. */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-3 py-2 sm:flex-nowrap sm:px-4">
        <span className="mr-2 hidden shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 sm:block">Admin</span>
        {LINKS.map(({ href, label, short, icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all sm:px-3',
                active
                  ? 'bg-amber/10 text-amber'
                  : 'text-ink-3 hover:bg-bg-1 hover:text-ink-1',
              ].join(' ')}
            >
              <span className={active ? 'text-amber' : 'text-ink-3'}>{icon}</span>
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
