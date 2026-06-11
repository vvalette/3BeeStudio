import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import NfcOrderForm from '@/components/nfc/NfcOrderForm'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'nfcPage.meta' })
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default function NfcPage() {
  const t = useTranslations('nfcPage')
  return (
    <main className="relative min-h-[calc(100dvh-72px)] overflow-hidden bg-bg-0">

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

      <div className="relative mx-auto max-w-2xl px-4 pb-20 pt-8">

        {/* Header */}
        <div className="mb-12 text-center fade-up">
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
                icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="2" y="5" width="10" height="8" rx="1.5" stroke="#F59E0B" strokeWidth="1.2"/><path d="M5 5V3.5a2 2 0 014 0V5" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round"/></svg>,
                label: t('trust.payment'),
              },
              {
                icon: <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3.2l2 1.3"/></svg>,
                label: t('trust.validation'),
              },
              {
                icon: <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4h9v7H1zM10 6h3l2 2v3h-5z"/><circle cx="4" cy="11" r="1.3"/><circle cx="12" cy="11" r="1.3"/></svg>,
                label: t('trust.delivery'),
              },
            ].map(({ icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[11px] font-medium text-ink-1"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line-amber)', backdropFilter: 'blur(8px)' }}
              >
                {icon}
                {label}
              </span>
            ))}
          </div>
        </div>

        <div id="commander" className="scroll-mt-[88px]">
          <NfcOrderForm />
        </div>
      </div>
    </main>
  )
}
