'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/boutique', label: 'Boutique' },
  { href: '/nfc', label: 'NFC B2B' },
  { href: '/sur-mesure', label: 'Sur-mesure' },
  { href: '/portfolio', label: 'Portfolio' },
] as const

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Logo size="md" />

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  pathname === href || pathname.startsWith(href + '/')
                    ? 'text-amber-500'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* CTA desktop */}
        <div className="hidden md:block">
          <Link
            href="/nfc#devis"
            className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-slate-900 font-syne transition-all hover:bg-amber-300 hover:-translate-y-0.5 hover:shadow-amber"
          >
            Devis NFC
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-slate-400 transition-colors hover:text-slate-200 md:hidden"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-slate-800 bg-slate-950 px-4 pb-5 pt-3 md:hidden">
          <ul className="flex flex-col gap-1">
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'block rounded-md px-4 py-3 text-sm font-medium transition-colors',
                    pathname === href || pathname.startsWith(href + '/')
                      ? 'text-amber-500'
                      : 'text-slate-300 hover:text-slate-200'
                  )}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/nfc#devis"
            onClick={() => setOpen(false)}
            className="mt-4 block rounded-lg bg-amber-500 px-5 py-3 text-center text-sm font-bold text-slate-900 font-syne transition-all hover:bg-amber-300"
          >
            Devis NFC
          </Link>
        </div>
      )}
    </header>
  )
}
