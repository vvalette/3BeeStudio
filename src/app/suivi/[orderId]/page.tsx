import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { sendOrderConfirmation } from '@/lib/resend'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS, formatDestination, calcOrder, type Order, type OrderStatus } from '@/types/order'
import { formatPrice } from '@/lib/utils'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Suivi de commande — 3BeeStudio',
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
        .single()

      if (updated) {
        // Envoi email en parallèle, non bloquant
        sendOrderConfirmation(updated as Order).catch((err) =>
          console.error('[suivi-sync] Email non bloquant:', err),
        )
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

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-12">
      <div className="mx-auto max-w-xl space-y-6">

        {/* Bannière succès paiement */}
        {payment === 'success' && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <p className="text-sm font-semibold text-emerald-400">✅ Paiement reçu — merci !</p>
            <p className="mt-1 text-xs text-ink-2">
              Un email de confirmation a été envoyé à {o.email}.
            </p>
          </div>
        )}

        {/* Prochaines étapes */}
        {(payment === 'success' || o.status !== 'pending_payment') && (
          <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-6 shadow-card">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-ink-3">Prochaines étapes</p>
            <div className="space-y-4">
              {[
                { n: 1, title: 'Validation sous 24h', desc: 'Nous vérifions votre logo et vos paramètres NFC.' },
                { n: 2, title: 'Impression & programmation', desc: 'Chaque porte-clé est imprimé en 3D et programmé à la main dans nos ateliers.' },
                { n: 3, title: 'Expédition', desc: 'Livraison suivie sous 5 à 10 jours ouvrés.' },
              ].map(({ n, title, desc }) => (
                <div key={n} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber/10 text-xs font-bold text-amber">
                    {n}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink-0">{title}</p>
                    <p className="mt-0.5 text-xs text-ink-3">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statut */}
        <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-6 shadow-card">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <p className="text-xs text-ink-3">Commande</p>
              <p className="font-mono text-xs text-ink-2">{o.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <StatusBadge status={o.status as OrderStatus} />
          </div>

          {/* Timeline */}
          {o.status !== 'pending_payment' && (
            <div className="space-y-0">
              {ORDER_STATUS_STEPS.map((s, i) => {
                const done = i <= currentStepIndex
                const active = i === currentStepIndex
                return (
                  <div key={s} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={[
                        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0',
                        done ? 'bg-amber text-bg-0' : 'bg-bg-3 text-ink-3',
                      ].join(' ')}>
                        {done ? '✓' : i + 1}
                      </div>
                      {i < ORDER_STATUS_STEPS.length - 1 && (
                        <div className={['w-px flex-1 my-1', done ? 'bg-amber/40' : 'bg-[var(--line)]'].join(' ')} style={{ minHeight: 20 }} />
                      )}
                    </div>
                    <div className="pb-4">
                      <p className={['text-sm font-medium', active ? 'text-amber' : done ? 'text-ink-1' : 'text-ink-3'].join(' ')}>
                        {ORDER_STATUS_LABELS[s]}
                      </p>
                      {s === 'shipped' && (o.tracking_url || o.tracking_number) && (
                        o.tracking_url ? (
                          <a
                            href={o.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-amber/30 bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber hover:bg-amber/20 transition-colors"
                          >
                            Suivre mon colis
                            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 3h6v6M11 3L3 11" />
                            </svg>
                          </a>
                        ) : (
                          <p className="mt-0.5 font-mono text-xs text-ink-2">
                            Suivi : {o.tracking_number}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {o.status === 'pending_payment' && (
            <p className="text-sm text-ink-2 text-center py-4">
              En attente de confirmation du paiement...
            </p>
          )}
        </div>

        {/* Détails commande */}
        <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-6 shadow-card space-y-3">
          <h2 className="text-sm font-semibold text-ink-0">Détails de la commande</h2>
          <div className="divide-y divide-[var(--line)]">
            <Row label="Entreprise" value={o.company} />
            <Row label="Email" value={o.email} />
            <Row label="Quantité" value={`${o.quantity} porte-clés`} />
            <Row label="Destination" value={formatDestination(o.nfc_url)} />
            <Row label="Livraison" value={calcOrder(o.quantity).shipping === 0 ? 'Offerte' : formatPrice(calcOrder(o.quantity).shipping)} />
            <Row label="Total réglé" value={formatPrice(o.total_amount)} />
          </div>
        </div>

        <p className="text-center text-xs text-ink-3">
          Une question ? Écrivez-nous à{' '}
          <a href="mailto:contact@3beestudio.fr" className="text-amber hover:underline">
            contact@3beestudio.fr
          </a>
        </p>
      </div>
    </main>
  )
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const colors: Record<OrderStatus, string> = {
    pending_payment: 'bg-zinc-500/20 text-zinc-400',
    confirmed: 'bg-blue-500/20 text-blue-400',
    processing: 'bg-purple-500/20 text-purple-400',
    printing: 'bg-orange-500/20 text-orange-400',
    printed: 'bg-lime-500/20 text-lime-400',
    shipped: 'bg-cyan-500/20 text-cyan-400',
    delivered: 'bg-emerald-500/20 text-emerald-400',
  }
  return (
    <span className={['rounded-pill px-3 py-1 text-xs font-semibold', colors[status]].join(' ')}>
      {ORDER_STATUS_LABELS[status]}
    </span>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-xs text-ink-3 shrink-0">{label}</span>
      <span className={['text-xs text-right text-ink-1 break-all', mono ? 'font-mono' : ''].join(' ')}>
        {value}
      </span>
    </div>
  )
}
