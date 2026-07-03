import { use } from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import Eyebrow from '@/components/ui/Eyebrow'

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'portfolio' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default function PortfolioPage({ params }: Props) {
  const { locale } = use(params)
  setRequestLocale(locale)
  const t = useTranslations('portfolio')
  return (
    <main className="relative min-h-[calc(100dvh-72px)] bg-bg-0 flex items-center justify-center overflow-hidden">

      {/* Background pattern */}
      <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none">
        <defs>
          <pattern id="port-tri" width="36" height="42" patternUnits="userSpaceOnUse">
            <path d="M18 3 L33 39 L3 39 Z" fill="none" stroke="rgba(245,158,11,1)" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#port-tri)" />
      </svg>

      {/* Ambient glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(245,158,11,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 text-center px-5 sm:px-8 max-w-2xl mx-auto">

        {/* Eyebrow */}
        <div className="mb-6 flex justify-center">
          <Eyebrow>Portfolio</Eyebrow>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2.5 mb-8 px-4 py-2 rounded-full border border-[var(--line-amber)]"
          style={{ background: 'rgba(245,158,11,0.06)', backdropFilter: 'blur(8px)' }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber" />
          </span>
          <span className="font-mono text-amber text-[11px] tracking-[0.12em] uppercase">{t('badge')}</span>
        </div>

        {/* Heading */}
        <h1
          className="font-sans font-extrabold text-ink-0 mb-5"
          style={{ fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', lineHeight: 1.0, letterSpacing: '-0.035em' }}
        >
          {t('heading')}
        </h1>

        <p className="text-ink-2 text-base sm:text-lg mb-10 max-w-md mx-auto leading-relaxed">
          {t('description')}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/boutique"
            className="inline-flex h-[50px] items-center justify-center rounded-pill px-8 font-semibold text-[15px] cursor-pointer transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5"
            style={{ background: 'var(--btn-primary-bg)', color: '#fff', boxShadow: 'var(--shadow-amber)' }}
          >
            {t('ctaShop')}
          </Link>
          <Link
            href="/custom"
            className="inline-flex h-[50px] items-center justify-center rounded-pill px-8 font-semibold text-[15px] text-ink-1 border border-[var(--line-2)] bg-bg-3 cursor-pointer transition-all duration-300 hover:bg-bg-4"
          >
            {t('ctaCustom')}
          </Link>
        </div>

        {/* Bottom hint */}
        <p className="mt-12 font-mono text-ink-3 text-[11px] tracking-widest uppercase">
          {t('hint')}
        </p>
      </div>
    </main>
  )
}
