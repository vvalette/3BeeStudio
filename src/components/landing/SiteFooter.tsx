'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Tooltip from '@/components/ui/Tooltip'

/* ── Social SVG icons ── */
function TikTokIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V9.07a8.16 8.16 0 0 0 4.77 1.52V7.15a4.85 4.85 0 0 1-1-.46z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  )
}

function EtsyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M9.194 4.116c0-.775.155-1.008.93-1.008h5.425c1.628 0 2.403.853 2.868 2.713l.31 1.24h1.24L19.58 2h-15.2C3 2 2.612 2.388 2.612 3.77v16.46c0 1.38.388 1.77 1.77 1.77h15.2l.542-5.14h-1.24l-.465 1.628c-.542 1.86-1.24 2.713-3.178 2.713H9.658c-.775 0-.93-.233-.93-1.008l-.155-6.2h3.876c1.55 0 1.86.542 2.093 2.093h1.24V11.01h-1.24c-.233 1.55-.542 2.093-2.093 2.093H8.574l.155-5.425h.465z" />
    </svg>
  )
}

const socials = [
  { label: 'TikTok',    href: 'https://www.tiktok.com/@3bee.studio',                              Icon: TikTokIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/3bee_studio_',                           Icon: InstagramIcon },
  { label: 'Etsy',      href: 'https://www.etsy.com/shop/3BeeStudioFR?ref=dashboard-header',      Icon: EtsyIcon },
] as const

const columns = [
  {
    titleKey: 'boutique.title',
    links: [
      { labelKey: 'boutique.all',     href: '/boutique' },
      { labelKey: 'boutique.deco',    href: '/boutique' },
      { labelKey: 'boutique.lamps',   href: '/boutique' },
      { labelKey: 'boutique.limited', href: '/boutique' },
    ],
  },
  {
    titleKey: 'nfc.title',
    links: [
      { labelKey: 'nfc.discover', href: '/nfc' },
      { labelKey: 'nfc.how',      href: '/nfc' },
      { labelKey: 'nfc.pricing',  href: '/nfc' },
      { labelKey: 'nfc.order',    href: '/nfc#commander' },
    ],
  },
  {
    titleKey: 'custom.title',
    links: [
      { labelKey: 'custom.start',     href: '/custom' },
      { labelKey: 'custom.process',   href: '/custom' },
      { labelKey: 'custom.portfolio', href: '/portfolio' },
      { labelKey: 'custom.contact',   href: '/contact' },
    ],
  },
] as const

export default function SiteFooter() {
  const t = useTranslations('footer')
  return (
    <footer className="border-t border-[var(--line)]" style={{ background: 'var(--footer-bg)' }}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">

        {/* ── Main grid ── */}
        <div className="grid gap-12 py-16 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">

          {/* Brand column */}
          <div>
            <Link href="/" className="inline-block mb-5">
              <Image
                src="/images/logo-name-only.png"
                alt="3BeeStudio"
                width={160}
                height={40}
                className="object-contain dark:mix-blend-lighten"
                style={{ height: 28, width: 'auto' }}
              />
            </Link>

            <p className="text-ink-2 mb-6 leading-relaxed" style={{ fontSize: 14, maxWidth: 260 }}>
              {t('tagline1')}<br />
              {t('tagline2')} 🇫🇷
            </p>

            {/* Social icons */}
            <div className="flex gap-2.5">
              {socials.map(({ label, href, Icon }) => (
                <Tooltip key={label} content={label} side="top">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-sm border border-[var(--line)] bg-bg-2 text-ink-2 transition-all hover:bg-bg-3 hover:text-amber hover:border-[var(--line-amber)] cursor-pointer"
                    style={{ borderRadius: 12 }}
                  >
                    <Icon />
                  </a>
                </Tooltip>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {columns.map((col) => (
            <div key={col.titleKey}>
              <div className="font-mono text-ink-3 mb-5" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
                {t(col.titleKey)}
              </div>
              <ul className="flex flex-col gap-3">
                {col.links.map(({ labelKey, href }) => (
                  <li key={labelKey}>
                    <Link
                      href={href}
                      className="text-ink-2 hover:text-amber transition-colors"
                      style={{ fontSize: 14 }}
                    >
                      {t(labelKey)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-[var(--line)] py-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="font-mono text-ink-3" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
              {t('rights')}
            </span>
            <a
              href="https://fr.trustpilot.com/review/3beestudio.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-ink-3 hover:text-[#00B67A] transition-colors cursor-pointer"
              style={{ fontSize: 10, letterSpacing: '0.04em' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 0L14.6 8H23.4L16.4 12.9L19 21L12 16.1L5 21L7.6 12.9L0.6 8H9.4L12 0Z" />
              </svg>
              Trustpilot
            </a>
          </div>
          <div className="flex flex-wrap gap-5">
            {([
              { labelKey: 'legal.mentions', href: '/mentions-legales' },
              { labelKey: 'legal.cgv',      href: '/cgv' },
              { labelKey: 'legal.privacy',  href: '/politique-de-confidentialite' },
            ] as const).map(({ labelKey, href }) => (
              <Link key={labelKey} href={href} className="font-mono text-ink-3 hover:text-ink-1 transition-colors" style={{ fontSize: 10, letterSpacing: '0.04em' }}>
                {t(labelKey)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
