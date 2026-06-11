import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import SurMesureForm from '@/components/surMesure/SurMesureForm'
import Eyebrow from '@/components/ui/Eyebrow'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'customPage.meta' })
  return {
    title: t('title'),
    description: t('description'),
  }
}

const STAT_IDS = ['quote', 'prototype', 'delivery'] as const
const STEP_IDS = ['describe', 'quote', 'production'] as const

export default function CustomPage() {
  const t = useTranslations('customPage')
  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-[var(--line)] py-16 lg:py-24" style={{ background: 'var(--bg-1)' }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(245,158,11,0.09), transparent 60%)' }}
        />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <div className="mb-5"><Eyebrow>{t('eyebrow')}</Eyebrow></div>
            <h1
              className="font-sans font-bold text-ink-0"
              style={{ fontSize: 'clamp(2.25rem, 5vw, 3.75rem)', lineHeight: 1.0, letterSpacing: '-0.03em' }}
            >
              {t.rich('heading', {
                honey: (chunks) => <span className="honey-text">{chunks}</span>,
                br: () => <br />,
              })}
            </h1>
            <p className="mt-5 text-ink-2" style={{ fontSize: 'clamp(1rem, 1.3vw, 1.1rem)', lineHeight: 1.6, maxWidth: 480 }}>
              {t.rich('intro', { nowrap: (chunks) => <span style={{ whiteSpace: 'nowrap' }}>{chunks}</span> })}
            </p>
            <div className="mt-10 flex flex-wrap gap-8 border-t border-[var(--line)] pt-8">
              {STAT_IDS.map((id) => (
                <div key={id}>
                  <div className="font-sans font-bold text-amber-soft" style={{ fontSize: '1.5rem', lineHeight: 1 }}>{t(`stats.${id}.value`)}</div>
                  <div className="font-mono text-ink-3 mt-1" style={{ fontSize: 11, letterSpacing: '0.06em' }}>{t(`stats.${id}.label`)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Contenu ── */}
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_440px] lg:gap-16 xl:gap-24">
          <div className="order-2 lg:order-1">
            <SurMesureForm />
          </div>
          <div className="order-1 lg:order-2 lg:pt-2">
            <h2 className="font-sans font-bold text-ink-0 mb-6" style={{ fontSize: '1.25rem', letterSpacing: '-0.02em' }}>
              {t('how.title')}
            </h2>
            <div className="space-y-5 mb-10">
              {STEP_IDS.map((id, i) => (
                <div key={id} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-mono font-bold text-amber text-[15px]"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    0{i + 1}
                  </div>
                  <div className="pt-2">
                    <p className="text-[14px] font-semibold text-ink-0 mb-1">{t(`how.steps.${id}.title`)}</p>
                    <p className="text-[13px] leading-relaxed text-ink-3">{t(`how.steps.${id}.desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Note tarification */}
            <div className="mb-5 rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.18)' }}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-amber" style={{ background: 'rgba(245,158,11,0.1)' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="6.5"/><path d="M8 7v4M8 5.5v.5"/>
                  </svg>
                </span>
                <div>
                  <p className="text-[12px] font-semibold text-amber-soft mb-1">{t('pricing.title')}</p>
                  <p className="text-[12px] leading-relaxed text-ink-3">
                    {t('pricing.body')}
                    <span className="block mt-1.5 text-ink-2">{t('pricing.note')}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-5 space-y-3.5">
              {[
                { label: t('benefits.freeQuote'), icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 1.5l5.5 2v4c0 3.2-2.3 5.6-5.5 7-3.2-1.4-5.5-3.8-5.5-7v-4l5.5-2z"/><path d="M5.5 8l1.8 1.8L10.8 6"/></svg> },
                { label: t('benefits.payment'), icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="5" width="13" height="9" rx="1.5"/><path d="M4.5 5V3.5a3.5 3.5 0 017 0V5"/></svg> },
                { label: t('benefits.deposit'), icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.5"/><path d="M8 4v1.5m0 5V12m-2-4.5a2 2 0 114 0c0 1.5-2 2-2 3.5"/></svg> },
                { label: t('benefits.vat'), icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M5 7h6M5 10h4"/></svg> },
              ].map(({ label, icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--line-2)] bg-bg-2 text-ink-2">
                    {icon}
                  </span>
                  <span className="text-[13px] text-ink-2">{label}</span>
                </div>
              ))}
            </div>
            <a href="mailto:contact@3beestudio.fr"
              className="group mt-5 flex items-center justify-between rounded-2xl border border-[var(--line)] bg-bg-1 px-5 py-4 transition-colors hover:border-[var(--line-amber)]">
              <div>
                <p className="text-[13px] font-semibold text-ink-0">{t('contactCard.title')}</p>
                <p className="text-[12px] text-ink-3 mt-0.5">contact@3beestudio.fr</p>
              </div>
              <svg className="text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-amber" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 3l4 4-4 4" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
