import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { sendShopOrderConfirmation } from '@/lib/resend'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { ShopOrder, ShopOrderStatus } from '@/types/shop-order'
import { SHOP_STATUS_LABELS, SHOP_STATUS_STEPS } from '@/types/shop-order'
import { SHOP_STATUS_PILL } from '@/lib/status-ui'
import { formatPrice } from '@/lib/utils'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Suivi commande — Boutique 3BeeStudio',
    robots: { index: false, follow: false },
  }
}

export const dynamic = 'force-dynamic'

async function syncStripePayment(order: ShopOrder): Promise<ShopOrder> {
  if (!order.stripe_checkout_session_id) return order
  try {
    const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id)
    if (session.payment_status === 'paid') {
      const { data: updated } = await supabaseAdmin
        .from('shop_orders')
        .update({ status: 'confirmed' })
        .eq('id', order.id)
        .eq('status', 'pending_payment')
        .select()
        .single()

      if (updated) {
        sendShopOrderConfirmation(updated as ShopOrder).catch((err) =>
          console.error('[suivi-boutique] Email non bloquant:', err),
        )
        return updated as ShopOrder
      }
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
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ payment?: string }>
}) {
  const { orderId }  = await params
  const { payment }  = await searchParams

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
  const isCancelled   = order.status === 'cancelled'
  const isJustPaid    = payment === 'success'
  const currentStep   = SHOP_STATUS_STEPS.indexOf(order.status)
  const orderRef      = order.id.slice(0, 8).toUpperCase()

  const stepLabel: Record<ShopOrderStatus, string> = {
    pending_payment: 'En attente de paiement',
    confirmed:       'Commande reçue',
    processing:      'En préparation',
    shipped:         'Expédiée',
    delivered:       'Livrée',
    cancelled:       'Annulée',
  }

  const stepIcon: Record<ShopOrderStatus, React.ReactNode> = {
    pending_payment: <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.3l-3.7 2 .7-4.1-3-2.9 4.2-.7L8 1z" />,
    confirmed:       <><path d="M3 8l3.5 3.5L13 5" /></>,
    processing:      <><path d="M4 6V2.5h8V6M4 11H2.5V6h11v5H12M4 9.5h8V14H4V9.5z" /></>,
    shipped:         <><path d="M1 11V5l4-3 4 3v6H1zM9 8h4l2 3v2h-6V8z" /></>,
    delivered:       <><path d="M2 8l4 4 8-8" /></>,
    cancelled:       <><path d="M4 4l8 8M12 4l-8 8" /></>,
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-12">
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
            <p className="relative mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-amber">Paiement confirmé</p>
            <h1 className="relative mt-2 font-extrabold text-ink-0"
              style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              Commande reçue !
            </h1>
            <p className="relative mt-2 text-sm text-ink-2">Un email de confirmation a été envoyé à <strong>{order.email}</strong></p>
          </header>
        ) : (
          <header className="pt-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Boutique · Suivi commande</p>
            <h1 className="mt-1.5 font-extrabold text-ink-0" style={{ fontSize: 'clamp(1.4rem, 4vw, 1.8rem)', letterSpacing: '-0.025em' }}>
              Commande #{orderRef}
            </h1>
          </header>
        )}

        {/* Statut actuel */}
        <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={['flex h-10 w-10 items-center justify-center rounded-xl', isCancelled ? 'bg-red-500/10' : 'bg-amber/10'].join(' ')}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke={isCancelled ? '#f87171' : '#F59E0B'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {stepIcon[order.status]}
                </svg>
              </div>
              <div>
                <p className="font-semibold text-ink-0">{stepLabel[order.status]}</p>
                <p className="text-[12px] text-ink-3">
                  {new Date(order.updated_at ?? order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <span className={['rounded-pill px-2.5 py-1 text-[11px] font-medium', SHOP_STATUS_PILL[order.status]].join(' ')}>
              {SHOP_STATUS_LABELS[order.status]}
            </span>
          </div>

          {/* Timeline */}
          {!isCancelled && (
            <div className="space-y-2 pt-2">
              {SHOP_STATUS_STEPS.map((s, i) => {
                const done    = i <= currentStep
                const current = i === currentStep
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className="relative flex flex-col items-center">
                      <div className={[
                        'h-3 w-3 rounded-full border-2 transition-all',
                        done ? 'border-amber bg-amber' : 'border-[var(--line)] bg-bg-2',
                        current ? 'ring-2 ring-amber/30' : '',
                      ].join(' ')} />
                      {i < SHOP_STATUS_STEPS.length - 1 && (
                        <div className={['mt-0.5 h-4 w-0.5 rounded', done ? 'bg-amber/40' : 'bg-[var(--line)]'].join(' ')} />
                      )}
                    </div>
                    <span className={['text-[13px]', done ? 'text-ink-0 font-medium' : 'text-ink-3'].join(' ')}>
                      {stepLabel[s]}
                      {current && <span className="ml-2 font-mono text-[10px] text-amber">← maintenant</span>}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Tracking */}
          {order.tracking_number && (
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
              <p className="text-[12px] font-medium text-cyan-400">Numéro de suivi</p>
              {order.tracking_url ? (
                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-0.5 font-mono text-sm text-ink-0 hover:text-amber transition-colors">
                  {order.tracking_number} →
                </a>
              ) : (
                <p className="mt-0.5 font-mono text-sm text-ink-0">{order.tracking_number}</p>
              )}
            </div>
          )}
        </div>

        {/* Récapitulatif commande */}
        <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-5 space-y-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Récapitulatif</h2>
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
              <span>Sous-total</span><span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-3">
              <span>Livraison</span><span>{order.shipping === 0 ? 'Offerte' : formatPrice(order.shipping)}</span>
            </div>
            <div className="flex justify-between font-bold text-ink-0 pt-1">
              <span>Total</span><span className="text-amber">{formatPrice(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Adresse */}
        {order.shipping_name && (
          <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-5">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Adresse de livraison</h2>
            <p className="text-sm text-ink-2 leading-relaxed">
              {order.shipping_name}<br />
              {order.shipping_address}
              {order.shipping_address2 && <><br />{order.shipping_address2}</>}<br />
              {order.shipping_postal_code} {order.shipping_city}
            </p>
          </div>
        )}

        {/* Prochaines étapes */}
        {isPaid && !isCancelled && order.status !== 'delivered' && (
          <div className="rounded-2xl border border-amber/20 bg-amber/5 p-5 space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-amber">Prochaines étapes</h2>
            <ul className="space-y-2 text-sm text-ink-2">
              {order.status === 'confirmed' && (
                <>
                  <li className="flex items-start gap-2"><span className="text-amber mt-0.5">→</span>Votre commande est en attente de préparation dans nos studios</li>
                  <li className="flex items-start gap-2"><span className="text-amber mt-0.5">→</span>Vous recevrez un email dès que votre commande est expédiée</li>
                </>
              )}
              {order.status === 'processing' && (
                <li className="flex items-start gap-2"><span className="text-amber mt-0.5">→</span>Votre commande est en cours de préparation — expédition prévue sous 2 à 3 jours</li>
              )}
              {order.status === 'shipped' && (
                <li className="flex items-start gap-2"><span className="text-amber mt-0.5">→</span>Votre colis est en route ! Délai estimé : 2 à 3 jours ouvrés</li>
              )}
            </ul>
          </div>
        )}

        {/* Contact */}
        <p className="text-center text-[12px] text-ink-3">
          Une question ? Écrivez-nous à{' '}
          <a href="mailto:contact@3beestudio.fr" className="text-amber hover:underline">contact@3beestudio.fr</a>
          {' '}en mentionnant votre référence <strong className="text-ink-2">#{orderRef}</strong>
        </p>

        <a href="/boutique" className="flex cursor-pointer items-center justify-center gap-2 rounded-pill border border-[var(--line)] py-3 text-sm font-medium text-ink-2 hover:text-ink-0 transition-colors">
          ← Retour à la boutique
        </a>
      </div>
    </main>
  )
}
