import { use } from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import NFCSection from '@/components/landing/NFCSection'
import NfcFaq from '@/components/nfc/NfcFaq'
import JsonLd from '@/components/seo/JsonLd'
import { buildAlternates } from '@/lib/seo'
import { nfcServiceSchema } from '@/lib/schema'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'nfcPage.meta' })
  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates('/nfc', locale),
  }
}

export default function NfcPage({ params }: Props) {
  const { locale } = use(params)
  setRequestLocale(locale)
  const t = useTranslations('nfcPage')
  return (
    <main className="relative min-h-[calc(100dvh-72px)] overflow-hidden bg-bg-0">

      <JsonLd data={nfcServiceSchema(t('meta.title'), t('meta.description'))} />

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: 800,
          height: 500,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.13), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Hex grid */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]">
        <defs>
          <pattern id="nfc-hex" x="0" y="0" width="48" height="56" patternUnits="userSpaceOnUse">
            <path d="M24 1 L46 13 L46 39 L24 51 L2 39 L2 13 Z" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#nfc-hex)" />
      </svg>

      <div className="relative mx-auto max-w-2xl px-4 pt-8">

        {/* Header */}
        <div className="mb-4 text-center fade-up">
          <h1
            className="font-extrabold text-ink-0"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', lineHeight: 1.05, letterSpacing: '-0.03em' }}
          >
            {t.rich('heading', { honey: (chunks) => <span className="honey-text">{chunks}</span> })}
          </h1>
          <p className="mt-4 text-ink-2" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
            {t('subtitle')}
          </p>

          {/* Trust chips */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
            {[
              {
                icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 1L8.5 5H13L9.5 7.5L11 12L7 9.5L3 12L4.5 7.5L1 5H5.5L7 1Z" fill="#F59E0B"/></svg>,
                label: t('trust.france'),
              },
              {
                icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round"><rect x="3.5" y="1.5" width="7" height="11" rx="1.5"/><path d="M6 10.5h2"/></svg>,
                label: t('trust.noApp'),
              },
              {
                icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1L3 8h4l-1 5 5-7H7l1-5z"/></svg>,
                label: t('trust.noBattery'),
              },
              {
                icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3.2l2 1.3"/></svg>,
                label: t('trust.quote'),
              },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[11px] font-medium text-ink-1"
                style={{ background: 'var(--hi-04)', border: '1px solid var(--line-amber)', backdropFilter: 'blur(8px)' }}
              >
                {icon}
                {label}
              </span>
            ))}
          </div>
        </div>

      </div>

      {/* Présentation : plus de commande en ligne, les porte-clés se font sur devis */}
      <div className="relative">
        <NFCSection variant="page" />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 pb-20">
        <NfcFaq />

        <section className="mt-16 rounded-2xl border border-[var(--line-amber)] px-6 py-10 text-center" style={{ background: 'var(--surface-amber-2)' }}>
          <h2 className="font-bold text-ink-0" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.7rem)', letterSpacing: '-0.02em' }}>
            {t('cta.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-ink-2" style={{ lineHeight: 1.6 }}>
            {t('cta.text')}
          </p>
          <Link
            href={{ pathname: '/custom', query: { type: 'nfc' } }}
            className="mt-6 inline-flex h-[54px] cursor-pointer items-center justify-center rounded-pill px-8 font-semibold text-[15px] text-[#1A1300] transition-all active:scale-[0.97] hover:brightness-105"
            style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
          >
            {t('cta.button')}
          </Link>
        </section>
      </div>
    </main>
  )
}
