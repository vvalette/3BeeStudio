'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { X, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import LocaleSwitcher from './LocaleSwitcher'

const navLinks = [
  { href: '/nfc',       key: 'nfc' },
  { href: '/custom',    key: 'custom' },
  { href: '/portfolio', key: 'portfolio' },
] as const

type Props = {
  showLocaleSwitcher?: boolean
}

export default function Navbar({ showLocaleSwitcher = false }: Props) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const [open, setOpen]         = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-[var(--line)] bg-bg-0/95 backdrop-blur-xl'
            : 'bg-transparent'
        )}
      >
        <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">

          {/* ── Logo ── */}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber rounded-lg"
            aria-label={t('home')}
          >
            <Image
              src="/images/logo-name-only.png"
              alt="3BeeStudio"
              width={180}
              height={44}
              priority
              className="object-contain mix-blend-lighten"
              style={{ height: 32, width: 'auto' }}
            />
          </Link>

          {/* ── Desktop links ── */}
          <ul className="hidden items-center gap-0.5 md:flex">
            {navLinks.map(({ href, key }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'relative px-4 py-2 text-[14px] font-medium rounded-md transition-colors',
                    isActive(href)
                      ? 'text-ink-0'
                      : 'text-ink-2 hover:text-ink-0'
                  )}
                >
                  {t(key)}
                  {isActive(href) && (
                    <span
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 block h-[3px] w-[3px] rounded-full bg-amber"
                      style={{ boxShadow: '0 0 6px var(--amber)' }}
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* ── Right : switcher + CTA + burger ── */}
          <div className="flex items-center gap-2.5">
            {showLocaleSwitcher && <LocaleSwitcher />}

            <Link
              href="/contact"
              className="hidden md:inline-flex h-10 items-center gap-1.5 rounded-pill px-5 text-[13px] font-semibold text-[#1A1300] transition-all active:scale-[0.97] hover:brightness-110"
              style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
            >
              {t('contact')}
            </Link>

            {/* Burger mobile */}
            <button
              aria-label={open ? t('closeMenu') : t('openMenu')}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] bg-bg-2 text-ink-1 transition-colors hover:bg-bg-3 hover:text-ink-0 md:hidden cursor-pointer"
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>
      </header>

      {/* ── Mobile overlay ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 flex flex-col md:hidden"
          style={{ background: 'var(--bg-0)', paddingTop: 72 }}
        >
          <div aria-hidden className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.10), transparent 60%)' }}
          />

          <nav className="relative flex flex-col flex-1 justify-center px-8 gap-2">
            {navLinks.map(({ href, key }, i) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  'group flex items-center justify-between py-4 border-b border-[var(--line)] transition-colors',
                  isActive(href) ? 'text-amber' : 'text-ink-1 hover:text-ink-0'
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="font-sans font-bold" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
                  {t(key)}
                </span>
                <span className="font-mono text-ink-3 group-hover:text-amber transition-colors" style={{ fontSize: 11 }}>
                  0{i + 1}
                </span>
              </Link>
            ))}
          </nav>

          {/* Switcher + CTA bottom */}
          <div className="relative px-8 pb-10 space-y-3">
            {showLocaleSwitcher && (
              <div className="flex justify-center">
                <LocaleSwitcher />
              </div>
            )}
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="flex h-[54px] w-full items-center justify-center rounded-pill font-sans font-semibold text-[15px] text-[#1A1300] transition-all active:scale-[0.97]"
              style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
            >
              {t('contact')}
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
