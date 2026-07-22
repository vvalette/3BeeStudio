import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { confirmShopOrder } from '@/lib/confirm-shop-order'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import type { ShopOrder, ShopOrderStatus } from '@/types/shop-order'
import { SHOP_STATUS_STEPS } from '@/types/shop-order'
import { SHOP_STATUS_PILL } from '@/lib/status-ui'
import { formatPrice } from '@/lib/utils'
import CartClearer from '@/components/boutique/CartClearer'
import { Link } from '@/i18n/navigation'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; orderId: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'boutique.suivi' })
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  }
}

export const dynamic = 'force-dynamic'

// Fallback si le webhook n'est pas encore passé quand le client atteint la page.
// Passe par confirmShopOrder (lib partagé avec le webhook) : quel que soit le gagnant
// de la course, le décrément de stock et l'email partent exactement une fois.
async function syncStripePayment(order: ShopOrder): Promise<ShopOrder> {
  if (!order.stripe_checkout_session_id) return order
  try {
    const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id)
    if (session.payment_status === 'paid') {
      const { order: confirmed } = await confirmShopOrder(order.id)
      if (confirmed) return confirmed
    }
  } catch (err) {
    console.error('[suivi-boutique] Stripe sync failed:', err)
  }
  return order
}

export default async function SuiviBoutiquePage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string; locale: Locale }>
  searchParams: Promise<{ payment?: string }>
}) {
  const { orderId, locale } = await params
  const { payment }  = await searchParams
  const t = await getTranslations({ locale, namespace: 'boutique.suivi' })

  const { data: raw, error } = await supabaseAdmin
    .from('shop_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (error || !raw) notFound()

  let order = raw as ShopOrder

  if (payment === 'success' && order.status === 'pending_payment') {
    order = await syncStripePayment(order)
  }

  const isPaid        = order.status !== 'pending_payment' && order.status !== 'cancelled'
  const isJustPaid    = payment === 'success'
  const currentStep   = SHOP_STATUS_STEPS.indexOf(order.status)
  const orderRef      = order.id.slice(0, 8).toUpperCase()

  const stepLabel: Record<ShopOrderStatus, string> = {
    pending_payment: t('statusLabels.pending_payment'),
    confirmed:       t('statusLabels.confirmed'),
    processing:      t('statusLabels.processing'),
    shipped:         t('statusLabels.shipped'),
    delivered:       t('statusLabels.delivered'),
    cancelled:       t('statusLabels.cancelled'),
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-12">
      {isJustPaid && <CartClearer />}
      <div className="mx-auto max-w-xl space-y-6">

        {/* En-tête */}
        {isJustPaid && isPaid ? (
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
            <p className="relative mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-amber">{t('paymentConfirmed')}</p>
            <h1 className="relative mt-2 font-extrabold text-ink-0"
              style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              {t('orderReceived')}
            </h1>
            <p className="relative mt-2 text-sm text-ink-2">{t('confirmationEmail')} <strong>{order.email}</strong></p>
          </header>
        ) : (
          <header className="pt-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">{t('eyebrow')}</p>
            <h1 className="mt-1.5 font-extrabold text-ink-0" style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', letterSpacing: '-0.025em' }}>
              {t('orderTitle', { ref: orderRef })}
            </h1>
          </header>
        )}

        {/* Avancement */}
        <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-1 shadow-card">
          <header className="flex items-center justify-between border-b border-[var(--line)] px-6 py-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{t('timelineHeading')}</h2>
            <span className={['rounded-pill px-3 py-1 text-xs font-semibold', SHOP_STATUS_PILL[order.status]].join(' ')}>
              {stepLabel[order.status]}
            </span>
          </header>

          <div className="p-6">
            {order.status !== 'pending_payment' ? (
              <div>
                {SHOP_STATUS_STEPS.map((s, i) => {
                  const done = i < currentStep
                  const active = i === currentStep
                  const last = i === SHOP_STATUS_STEPS.length - 1
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
                          {stepLabel[s]}
                          {active && (
                            <span className="ml-2 align-middle font-mono text-[10px] uppercase tracking-[0.12em] text-amber">
                              {t('inProgress')}
                            </span>
                          )}
                        </p>
                        {active && t.has(`hints.${s}`) && (
                          <p className="mt-0.5 max-w-xs text-xs leading-relaxed text-ink-2">{t(`hints.${s}`)}</p>
                        )}
                        {s === 'shipped' && i <= currentStep && (order.tracking_url || order.tracking_number) && (
                          order.tracking_url ? (
                            <a
                              href={order.tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1.5 rounded-pill border border-amber/30 bg-amber/10 px-3.5 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/20"
                            >
                              {t('trackParcel')}
                              <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 3h6v6M11 3L3 11" />
                              </svg>
                            </a>
                          ) : (
                            <p className="mt-1 font-mono text-xs text-ink-2">{t('trackingShort', { number: order.tracking_number ?? '' })}</p>
                          )
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
                <p className="text-sm text-ink-2">{t('pendingPaymentMsg')}</p>
              </div>
            )}
          </div>
        </section>

        {/* Récapitulatif commande */}
        <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-5 space-y-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{t('summary')}</h2>
          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-ink-1">{item.quantity}× {item.product_name}</span>
                <span className="font-mono text-ink-2">{formatPrice(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1 border-t border-[var(--line)] pt-3 text-[13px]">
            <div className="flex justify-between text-ink-3">
              <span>{t('subtotal')}</span><span>{formatPrice(order.subtotal)}</span>
            </div>
            {(order.discount_amount ?? 0) > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>{t('newsletterDiscount')}</span><span>−{formatPrice(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink-3">
              <span>{t('shipping')}</span><span>{order.shipping === 0 ? t('shippingFree') : formatPrice(order.shipping)}</span>
            </div>
            <div className="flex justify-between font-bold text-ink-0 pt-1">
              <span>{t('total')}</span><span className="text-amber">{formatPrice(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Adresse / Mode retrait */}
        {order.delivery_mode === 'pickup' ? (
          <div className="rounded-2xl border border-amber/20 bg-amber/5 p-5">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-amber">{t('pickupMode')}</h2>
            <p className="text-sm text-ink-2 leading-relaxed">{t('pickupAddress')}</p>
            <p className="mt-2 text-[12px] text-ink-3">{t('pickupContact')}</p>
          </div>
        ) : order.shipping_name ? (
          <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-5">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{t('shippingAddress')}</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              {order.shipping_name}<br />
              {order.shipping_address}
              {order.shipping_address2 && <><br />{order.shipping_address2}</>}<br />
              {order.shipping_postal_code} {order.shipping_city}
            </p>
          </div>
        ) : null}

        {/* Contact */}
        <p className="text-center text-[12px] text-ink-3">
          {t.rich('contactMsg', {
            email: () => <a href="mailto:contact@3beestudio.fr" className="text-amber hover:underline">contact@3beestudio.fr</a>,
            ref: orderRef,
          })}
        </p>

        <Link href="/boutique" className="flex cursor-pointer items-center justify-center gap-2 rounded-pill border border-[var(--line)] py-3 text-sm font-medium text-ink-2 hover:text-ink-0 transition-colors">
          {t('backToShop')}
        </Link>
      </div>
    </main>
  )
}
