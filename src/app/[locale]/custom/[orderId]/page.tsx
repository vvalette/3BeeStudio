import { supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CUSTOM_STATUS_STEPS, BUDGET_RANGES, DEADLINES, BUDGET_KEYS, DEADLINE_KEYS, PROJECT_TYPES, type CustomOrder, type CustomOrderStatus } from '@/types/custom-order'
import { formatPrice } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'suiviMesure' })
  return {
    title: t('meta.title'),
    robots: { index: false, follow: false },
  }
}
export const dynamic = 'force-dynamic'

const PROJECT_VALUES = PROJECT_TYPES.map((p) => p.value) as readonly string[]

export default async function SuiviMesurePage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ submitted?: string; payment?: string }>
}) {
  const { orderId } = await params
  const { submitted, payment } = await searchParams
  const t = await getTranslations('suiviMesure')
  const tForm = await getTranslations('surMesureForm')

  const { data: orderRaw, error } = await supabaseAdmin
    .from('custom_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !orderRaw) notFound()

  const o = orderRaw as CustomOrder
  const currentStepIndex = CUSTOM_STATUS_STEPS.indexOf(o.status)

  const isJustSubmitted = submitted === 'true'
  const isJustPaid      = payment === 'success'

  // Libellés traduits (valeurs canoniques FR stockées → libellé localisé, repli sur la valeur brute)
  const statusLabel = (s: CustomOrderStatus) => t(`statuses.${s}`)
  const projectLabel = PROJECT_VALUES.includes(o.project_type) ? tForm(`projectTypes.${o.project_type}`) : o.project_type
  const bIdx = BUDGET_RANGES.indexOf(o.budget_range as (typeof BUDGET_RANGES)[number])
  const dIdx = DEADLINES.indexOf(o.deadline as (typeof DEADLINES)[number])
  const budgetLabel = bIdx >= 0 ? tForm(`budget.${BUDGET_KEYS[bIdx]}`) : o.budget_range
  const deadlineLabel = dIdx >= 0 ? tForm(`deadline.${DEADLINE_KEYS[dIdx]}`) : o.deadline

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-12">
      <div className="mx-auto max-w-xl space-y-6">

        {/* ── En-tête ── */}
        {isJustSubmitted ? (
          <header className="relative pt-6 pb-2 text-center">
            <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
              style={{ width: 420, height: 260, background: 'radial-gradient(ellipse at 50% 20%, rgba(245,158,11,0.16), transparent 70%)', filter: 'blur(30px)' }}
            />
            <div className="relative mx-auto h-20 w-20">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="37" stroke="rgba(245,158,11,0.18)" strokeWidth="1.5" />
                <circle cx="40" cy="40" r="37" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"
                  strokeDasharray="233" strokeDashoffset="233" transform="rotate(-90 40 40)"
                  style={{ animation: 'draw-stroke 700ms 150ms cubic-bezier(0.2,0.7,0.2,1) forwards' }}
                />
                <path d="M27 41.5L36.5 50.5L53 32.5" stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="40" strokeDashoffset="40"
                  style={{ animation: 'draw-stroke 450ms 650ms cubic-bezier(0.2,0.7,0.2,1) forwards', filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.5))' }}
                />
              </svg>
            </div>
            <p className="relative mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-amber">{t('submitted.eyebrow')}</p>
            <h1 className="relative mt-2 font-extrabold text-ink-0"
              style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {t('submitted.title')}
            </h1>
            <p className="relative mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-2">
              {t.rich('submitted.lead', {
                email: o.email,
                b: (chunks) => <span className="font-medium text-ink-0">{chunks}</span>,
              })}
            </p>
            <div className="relative mt-5 inline-flex items-center gap-2 rounded-pill px-4 py-2"
              style={{ background: 'var(--hi-04)', border: '1px solid var(--line-amber)' }}>
              <span className="text-[11px] text-ink-3">{t('submitted.reference')}</span>
              <span className="font-mono text-xs font-semibold tracking-wider text-amber-soft">
                #{o.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </header>
        ) : isJustPaid ? (
          <header className="pt-4 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">{t('paid.eyebrow')}</p>
            <h1 className="mt-2 font-extrabold text-ink-0" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', letterSpacing: '-0.03em' }}>
              {t('paid.title')}
            </h1>
            <p className="mt-2 text-sm text-ink-2">{t('paid.desc')}</p>
          </header>
        ) : (
          <header className="pt-2 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">{t('default.eyebrow')}</p>
            <h1 className="mt-2 font-extrabold text-ink-0" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', letterSpacing: '-0.03em' }}>
              {t.rich('default.title', { mono: () => <span className="font-mono">#{o.id.slice(0, 8).toUpperCase()}</span> })}
            </h1>
          </header>
        )}

        {/* ── Payer l'acompte (si devis envoyé + lien dispo) ── */}
        {o.status === 'quote_sent' && o.payment_url && (
          <section className="overflow-hidden rounded-2xl border border-amber/40 bg-[rgba(245,158,11,0.06)] p-5">
            <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-amber mb-3">{t('action.eyebrow')}</p>
            <p className="text-sm font-semibold text-ink-0 mb-1">{t('action.title')}</p>
            <p className="text-xs text-ink-3 mb-4">
              {o.deposit_amount && <>{t('action.deposit')} <span className="text-ink-1 font-mono">{formatPrice(o.deposit_amount)}</span> — </>}
              {o.total_amount && <>{t('action.total')} <span className="text-ink-1 font-mono">{formatPrice(o.total_amount)}</span></>}
            </p>
            <a
              href={o.payment_url}
              className="flex h-[48px] w-full items-center justify-center gap-2 rounded-pill font-semibold text-[14px] text-[#1A1300] transition-all hover:brightness-105"
              style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
            >
              {t('action.pay')}
            </a>
          </section>
        )}

        {/* ── Timeline ── */}
        <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-1 shadow-card">
          <header className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{t('timeline.heading')}</h2>
            <StatusBadge status={o.status} label={statusLabel(o.status)} />
          </header>

          <div className="p-6">
            <div>
              {CUSTOM_STATUS_STEPS.map((s, i) => {
                if (s === 'cancelled') return null
                const done   = i < currentStepIndex
                const active = i === currentStepIndex
                const last   = i === CUSTOM_STATUS_STEPS.length - 1
                return (
                  <div key={s} className="flex items-stretch gap-4">
                    <div className="flex flex-col items-center">
                      {done ? (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber text-bg-0">
                          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2.5 7.5l3 3 6-7" />
                          </svg>
                        </span>
                      ) : active ? (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber/60 bg-amber/10"
                          style={{ boxShadow: '0 0 0 4px rgba(245,158,11,0.12), 0 0 16px rgba(245,158,11,0.25)' }}>
                          <span className="h-2 w-2 rounded-full bg-amber" />
                        </span>
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--line-2)] bg-bg-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-ink-3/50" />
                        </span>
                      )}
                      {!last && (
                        <span className="w-px flex-1 my-1" style={{
                          minHeight: 18,
                          background: done
                            ? 'rgba(245,158,11,0.45)'
                            : active
                              ? 'linear-gradient(180deg, rgba(245,158,11,0.45), var(--line))'
                              : 'var(--line)',
                        }} />
                      )}
                    </div>
                    <div className={last ? 'pb-0' : 'pb-5'}>
                      <p className={['text-sm leading-7', active ? 'font-semibold text-ink-0' : done ? 'font-medium text-ink-1' : 'font-medium text-ink-3'].join(' ')}>
                        {statusLabel(s)}
                        {active && <span className="ml-2 align-middle font-mono text-[10px] uppercase tracking-[0.12em] text-amber">{t('timeline.inProgress')}</span>}
                      </p>
                      {active && t.has(`hints.${s}`) && (
                        <p className="mt-0.5 max-w-xs text-xs leading-relaxed text-ink-2">{t(`hints.${s}`)}</p>
                      )}
                      {s === 'shipped' && i <= currentStepIndex && (o.tracking_url || o.tracking_number) && (
                        o.tracking_url ? (
                          <a href={o.tracking_url} target="_blank" rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 rounded-pill border border-amber/30 bg-amber/10 px-3.5 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/20">
                            {t('timeline.track')}
                            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 3h6v6M11 3L3 11" />
                            </svg>
                          </a>
                        ) : (
                          <p className="mt-1 font-mono text-xs text-ink-2">{t('timeline.tracking', { number: o.tracking_number ?? '' })}</p>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Détails du projet ── */}
        <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-1 shadow-card">
          <header className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{t('details.heading')}</h2>
            <span className="font-mono text-[11px] tracking-wider text-ink-3">#{o.id.slice(0, 8).toUpperCase()}</span>
          </header>

          <div className="space-y-4 p-6">
            <Row label={t('details.type')} value={projectLabel} />
            <Row label={t('details.budget')} value={budgetLabel} />
            <Row label={t('details.deadline')} value={deadlineLabel} />
            {o.company && <Row label={t('details.company')} value={o.company} />}

            {o.description && (
              <div className="pt-1">
                <p className="text-[11px] uppercase tracking-[0.1em] text-ink-3 mb-2">{t('details.description')}</p>
                <p className="text-sm leading-relaxed text-ink-2 whitespace-pre-wrap">{o.description}</p>
              </div>
            )}

            {o.shipping_address && (
              <div className="flex items-start gap-3.5 rounded-xl border border-[var(--line)] bg-bg-0/40 p-4 mt-2">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-3 text-ink-2">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 6.5c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 0110 0z" /><circle cx="8" cy="6.5" r="1.8" />
                  </svg>
                </span>
                <address className="text-xs not-italic leading-relaxed text-ink-2">
                  {o.shipping_name && <span className="block font-semibold text-ink-1">{o.shipping_name}</span>}
                  <span className="block">{o.shipping_address}</span>
                  <span className="block">{`${o.shipping_postal_code ?? ''} ${o.shipping_city ?? ''}`.trim()}</span>
                </address>
              </div>
            )}
          </div>
        </section>

        {/* ── Contact ── */}
        <a
          href="mailto:contact@3beestudio.fr"
          className="group flex items-center justify-between rounded-2xl border border-[var(--line)] bg-bg-1 px-6 py-4 transition-colors hover:border-[var(--line-amber)]"
        >
          <div className="flex items-center gap-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber/20 bg-amber/10 text-amber">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1.5" y="3" width="13" height="10" rx="1.5" /><path d="M1.5 4.5L8 9l6.5-4.5" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-0">{t('contact.title')}</p>
              <p className="mt-0.5 text-xs text-ink-3">{t('contact.sub')}</p>
            </div>
          </div>
          <svg className="shrink-0 text-ink-3 transition-all group-hover:translate-x-0.5 group-hover:text-amber"
            width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 3l4 4-4 4" />
          </svg>
        </a>
      </div>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-ink-3 shrink-0">{label}</span>
      <span className="text-sm text-ink-1 text-right">{value}</span>
    </div>
  )
}

function StatusBadge({ status, label }: { status: CustomOrderStatus; label: string }) {
  const styles: Record<CustomOrderStatus, string> = {
    pending_quote: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    quote_sent:    'bg-amber/10 text-amber border border-amber/25',
    deposit_paid:  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    in_production: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    shipped:       'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    delivered:     'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    cancelled:     'bg-red-500/10 text-red-400 border border-red-500/20',
  }
  return (
    <span className={['rounded-pill px-3 py-1 text-xs font-semibold', styles[status]].join(' ')}>
      {label}
    </span>
  )
}
