import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { sendNfcOrderEmails } from '@/lib/resend'
import { ORDER_STATUS_STEPS, formatDestination, calcOrder, type Order, type OrderStatus } from '@/types/order'
import { formatPrice } from '@/lib/utils'
import { resolveTracking } from '@/lib/tracking'
import { STATUS_PILL } from '@/lib/status-ui'
import { DestinationIcon } from '@/components/nfc/NfcLinkPicker'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'suiviNfc' })
  return {
    title: t('meta.title'),
    robots: { index: false, follow: false },
  }
}

export const dynamic = 'force-dynamic'

async function syncStripePayment(order: Order): Promise<Order> {
  if (!order.stripe_checkout_session_id) return order

  try {
    const session = await stripe.checkout.sessions.retrieve(
      order.stripe_checkout_session_id,
    )

    if (session.payment_status === 'paid') {
      const { data: updated } = await supabaseAdmin
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', order.id)
        .eq('status', 'pending_payment') // n'écraser que si pas déjà confirmé
        .select()
        .maybeSingle() // rejeu/course avec le webhook → 0 ligne sans erreur

      if (updated) {
        // Envoi emails en parallèle, non bloquant (client + notification interne)
        void sendNfcOrderEmails(updated as Order)
        return updated as Order
      }
    }
  } catch (err) {
    console.error('[suivi] Stripe sync failed:', err)
  }

  return order
}

export default async function SuiviPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ payment?: string }>
}) {
  const { orderId } = await params
  const { payment } = await searchParams
  const t = await getTranslations('suiviNfc')

  const { data: orderRaw, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !orderRaw) notFound()

  let o = orderRaw as Order

  // Si retour Stripe et statut encore pending — sync direct avec l'API Stripe
  // (fallback si le webhook est lent ou non encore configuré)
  if (payment === 'success' && o.status === 'pending_payment') {
    o = await syncStripePayment(o)
  }

  const currentStepIndex = ORDER_STATUS_STEPS.indexOf(o.status as OrderStatus)
  const tracking = resolveTracking(o.tracking_url, o.tracking_number)

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-12">
      <div className="mx-auto max-w-xl space-y-6">

        {/* En-tête — confirmation après paiement, suivi sobre sinon */}
        {payment === 'success' ? (
          <header className="relative pt-6 pb-2 text-center">
            {/* Halo */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
              style={{
                width: 420, height: 260,
                background: 'radial-gradient(ellipse at 50% 20%, rgba(245,158,11,0.16), transparent 70%)',
                filter: 'blur(30px)',
              }}
            />

            {/* Coche dessinée dans un anneau */}
            <div className="relative mx-auto h-20 w-20">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="37" stroke="rgba(245,158,11,0.18)" strokeWidth="1.5" />
                <circle
                  cx="40" cy="40" r="37"
                  stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"
                  strokeDasharray="233" strokeDashoffset="233"
                  transform="rotate(-90 40 40)"
                  style={{ animation: 'draw-stroke 700ms 150ms cubic-bezier(0.2,0.7,0.2,1) forwards' }}
                />
                <path
                  d="M27 41.5L36.5 50.5L53 32.5"
                  stroke="#FBBF24" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="40" strokeDashoffset="40"
                  style={{ animation: 'draw-stroke 450ms 650ms cubic-bezier(0.2,0.7,0.2,1) forwards', filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.5))' }}
                />
              </svg>
            </div>

            <p className="relative mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-amber">
              {t('success.eyebrow')}
            </p>
            <h1
              className="relative mt-2 font-extrabold text-ink-0"
              style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', letterSpacing: '-0.03em', lineHeight: 1.1 }}
            >
              {t('success.title')}
            </h1>
            <p className="relative mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-2">
              {t.rich('success.lead', {
                email: o.email,
                b: (chunks) => <span className="font-medium text-ink-0">{chunks}</span>,
              })}
            </p>

            <div
              className="relative mt-5 inline-flex items-center gap-2 rounded-pill px-4 py-2"
              style={{ background: 'var(--hi-04)', border: '1px solid var(--line-amber)' }}
            >
              <span className="text-[11px] text-ink-3">{t('success.reference')}</span>
              <span className="font-mono text-xs font-semibold tracking-wider text-amber-soft">
                #{o.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
          </header>
        ) : (
          <header className="pt-2 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">{t('default.eyebrow')}</p>
            <h1 className="mt-2 font-extrabold text-ink-0" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', letterSpacing: '-0.03em' }}>
              {t.rich('default.title', { mono: () => <span className="font-mono">#{o.id.slice(0, 8).toUpperCase()}</span> })}
            </h1>
          </header>
        )}

        {/* Comment ça se passe — uniquement après paiement */}
        {payment === 'success' && (
          <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-1 shadow-card">
            <header className="border-b border-[var(--line)] px-6 py-4">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{t('how.heading')}</h2>
            </header>
            <div className="space-y-5 p-6">
              {[
                {
                  title: t('how.validation.title'),
                  desc: t('how.validation.desc'),
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 1.5l5.5 2v4c0 3.2-2.3 5.6-5.5 7-3.2-1.4-5.5-3.8-5.5-7v-4l5.5-2z" />
                      <path d="M5.5 8l1.8 1.8L10.8 6" />
                    </svg>
                  ),
                },
                {
                  title: t('how.printing.title'),
                  desc: t('how.printing.desc'),
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 6V2.5h8V6M4 11H2.5V6h11v5H12M4 9.5h8V14H4V9.5z" />
                    </svg>
                  ),
                },
                {
                  title: t('how.shipping.title'),
                  desc: t('how.shipping.desc'),
                  icon: (
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1.5 3.5h8v8h-8v-8zM9.5 6h3l2 2.5v3h-5V6z" />
                      <circle cx="4.5" cy="12.5" r="1.4" /><circle cx="11.5" cy="12.5" r="1.4" />
                    </svg>
                  ),
                },
              ].map(({ title, desc, icon }) => (
                <div key={title} className="flex items-start gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber/20 bg-amber/10 text-amber">
                    {icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-0">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Avancement */}
        <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-1 shadow-card">
          <header className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{t('timeline.heading')}</h2>
            <StatusBadge status={o.status as OrderStatus} label={t(`statuses.${o.status}`)} />
          </header>

          <div className="p-6">
            {o.status !== 'pending_payment' ? (
              <div>
                {ORDER_STATUS_STEPS.map((s, i) => {
                  const done = i < currentStepIndex
                  const active = i === currentStepIndex
                  const last = i === ORDER_STATUS_STEPS.length - 1
                  return (
                    <div key={s} className="flex items-stretch gap-4">
                      {/* Pastille + connecteur */}
                      <div className="flex flex-col items-center">
                        {done ? (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber text-bg-0">
                            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2.5 7.5l3 3 6-7" />
                            </svg>
                          </span>
                        ) : active ? (
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber/60 bg-amber/10"
                            style={{ boxShadow: '0 0 0 4px rgba(245,158,11,0.12), 0 0 16px rgba(245,158,11,0.25)' }}
                          >
                            <span className="h-2 w-2 rounded-full bg-amber" />
                          </span>
                        ) : (
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--line-2)] bg-bg-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-ink-3/50" />
                          </span>
                        )}
                        {!last && (
                          <span
                            className="w-px flex-1 my-1"
                            style={{
                              minHeight: 18,
                              background: done
                                ? 'rgba(245,158,11,0.45)'
                                : active
                                  ? 'linear-gradient(180deg, rgba(245,158,11,0.45), var(--line))'
                                  : 'var(--line)',
                            }}
                          />
                        )}
                      </div>

                      {/* Libellé + détail */}
                      <div className={last ? 'pb-0' : 'pb-5'}>
                        <p className={[
                          'text-sm leading-7',
                          active ? 'font-semibold text-ink-0' : done ? 'font-medium text-ink-1' : 'font-medium text-ink-3',
                        ].join(' ')}>
                          {t(`statuses.${s}`)}
                          {active && (
                            <span className="ml-2 align-middle font-mono text-[10px] uppercase tracking-[0.12em] text-amber">
                              {t('timeline.inProgress')}
                            </span>
                          )}
                        </p>
                        {active && t.has(`hints.${s}`) && (
                          <p className="mt-0.5 max-w-xs text-xs leading-relaxed text-ink-2">{t(`hints.${s}`)}</p>
                        )}
                        {/* Pas de garde `i <= currentStepIndex` : le suivi est souvent saisi
                            alors que la commande est encore en préparation — le client
                            ne le voyait jamais. */}
                        {s === 'shipped' && (tracking.href || tracking.number) && (
                          <div className="mt-2 space-y-1">
                            {tracking.href && (
                              <a
                                href={tracking.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-pill border border-amber/30 bg-amber/10 px-3.5 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/20"
                              >
                                {t('timeline.track')}
                                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M5 3h6v6M11 3L3 11" />
                                </svg>
                              </a>
                            )}
                            {tracking.number && (
                              <p className="break-all font-mono text-xs text-ink-2">{t('timeline.tracking', { number: tracking.number })}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber/50" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber" />
                </span>
                <p className="text-sm text-ink-2">{t('timeline.pendingPayment')}</p>
              </div>
            )}
          </div>
        </section>

        {/* Votre commande */}
        <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-1 shadow-card">
          <header className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{t('order.heading')}</h2>
            <span className="font-mono text-[11px] tracking-wider text-ink-3">#{o.id.slice(0, 8).toUpperCase()}</span>
          </header>

          <div className="space-y-5 p-6">
            {/* Produit */}
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                style={{ background: 'var(--hi-04)', border: '1px solid var(--line-amber)' }}
              >
                {o.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.logo_url} alt={t('order.logoAlt', { company: o.company })} className="h-10 w-10 object-contain" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" strokeWidth="1.3">
                    <rect x="2" y="2" width="12" height="12" rx="2" /><circle cx="6" cy="6" r="1.3" /><path d="M2 11l3.5-3.5L9 11l2.5-2.5L14 11" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-0">
                  {t('order.product', { quantity: o.quantity })}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-3">{o.company}</p>
                <span
                  className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-pill px-2 py-0.5"
                  style={{ background: 'var(--hi-04)', border: '1px solid var(--line)' }}
                >
                  <span className="flex shrink-0 text-ink-3"><DestinationIcon value={o.nfc_url} size={10} /></span>
                  <span className="truncate font-mono text-[10px] text-ink-2">{formatDestination(o.nfc_url)}</span>
                </span>
              </div>
            </div>

            {/* Livraison */}
            {o.shipping_address && o.shipping_city && (
              <div className="flex items-start gap-3.5 rounded-xl border border-[var(--line)] bg-bg-0/40 p-4">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-3 text-ink-2">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 6.5c0 3.5-5 8-5 8s-5-4.5-5-8a5 5 0 0110 0z" /><circle cx="8" cy="6.5" r="1.8" />
                  </svg>
                </span>
                <address className="text-xs not-italic leading-relaxed text-ink-2">
                  {o.shipping_name && <span className="block font-semibold text-ink-1">{o.shipping_name}</span>}
                  <span className="block">{o.shipping_address}</span>
                  {o.shipping_address2 && <span className="block">{o.shipping_address2}</span>}
                  <span className="block">{`${o.shipping_postal_code ?? ''} ${o.shipping_city}`.trim()}</span>
                </address>
              </div>
            )}

            {/* Reçu */}
            <div className="space-y-2 pt-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-ink-3">
                  {t('order.subtotal')} <span className="font-mono text-ink-3">· {o.quantity} × {formatPrice(calcOrder(o.quantity).unitPrice)}</span>
                </span>
                <span className="font-mono text-ink-1">{formatPrice(calcOrder(o.quantity).subtotal)}</span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-ink-3">{t('order.shipping')}</span>
                {calcOrder(o.quantity).shipping === 0 ? (
                  <span className="font-mono font-semibold text-emerald-400">{t('order.free')}</span>
                ) : (
                  <span className="font-mono text-ink-1">{formatPrice(calcOrder(o.quantity).shipping)}</span>
                )}
              </div>
              <div className="border-t border-dashed border-[var(--line-2)] pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-ink-0">{t('order.totalPaid')}</span>
                  <span className="font-mono text-lg font-bold text-amber">{formatPrice(o.total_amount)}</span>
                </div>
                <p className="mt-1 text-right text-[10px] text-ink-3">{t('order.vat')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
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
          <svg
            className="shrink-0 text-ink-3 transition-all group-hover:translate-x-0.5 group-hover:text-amber"
            width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M5 3l4 4-4 4" />
          </svg>
        </a>
      </div>
    </main>
  )
}

function StatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  return (
    <span className={['rounded-pill px-3 py-1 text-xs font-semibold', STATUS_PILL[status]].join(' ')}>
      {label}
    </span>
  )
}
