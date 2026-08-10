'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CUSTOM_STATUS_LABELS, type CustomOrder, type CustomOrderStatus } from '@/types/custom-order'
import { formatPrice } from '@/lib/utils'
import { CUSTOM_STATUS_PILL, CUSTOM_STATUS_ACCENT } from '@/lib/status-ui'

const MANUAL_STATUSES: CustomOrderStatus[] = [
  'pending_quote', 'quote_sent', 'deposit_paid', 'in_production', 'shipped', 'delivered', 'cancelled',
]

export default function AdminCustomOrderDetail({ order: initialOrder }: { order: CustomOrder }) {
  const [order, setOrder]               = useState(initialOrder)
  const [saving, setSaving]             = useState(false)
  const [successMsg, setSuccessMsg]     = useState<string | null>(null)
  const [notesInput, setNotesInput]     = useState(order.admin_notes ?? '')
  const [trackingNum, setTrackingNum]   = useState(order.tracking_number ?? '')
  const [trackingUrl, setTrackingUrl]   = useState(order.tracking_url ?? '')
  const [depositInput, setDepositInput] = useState(order.deposit_amount ? String(order.deposit_amount / 100) : '')
  const [totalInput, setTotalInput]     = useState(order.total_amount ? String(order.total_amount / 100) : '')
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError]     = useState<string | null>(null)
  const [quoteSent, setQuoteSent]       = useState(false)
  const router = useRouter()

  const status = order.status as CustomOrderStatus
  const suiviUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/custom/${order.id}`

  async function updateField(updates: Partial<CustomOrder>) {
    setSaving(true)
    setSuccessMsg(null)
    try {
      const res = await fetch(`/api/admin/custom/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updated = await res.json() as CustomOrder
        setOrder(updated)
        setSuccessMsg('Sauvegardé')
        setTimeout(() => setSuccessMsg(null), 2000)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  async function sendQuote() {
    const depositCents = Math.round(parseFloat(depositInput) * 100)
    const totalCents   = totalInput ? Math.round(parseFloat(totalInput) * 100) : undefined

    if (!depositCents || isNaN(depositCents)) {
      setQuoteError('Montant de l\'acompte requis')
      return
    }

    setQuoteLoading(true)
    setQuoteError(null)
    try {
      const res = await fetch(`/api/custom/${order.id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deposit_amount: depositCents, total_amount: totalCents }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erreur inattendue')
      setQuoteSent(true)
      setOrder((o) => ({ ...o, status: 'quote_sent' }))
      router.refresh()
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setQuoteLoading(false)
    }
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-10">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Link
            href="/admin/commandes"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line-2)] bg-bg-1 text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-amber"
            aria-label="Retour à la liste"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 7H3M3 7l3.5-3.5M3 7l3.5 3.5" />
            </svg>
          </Link>

          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-mono text-lg font-bold text-ink-2"
            style={{ background: 'var(--hi-04)', border: '1px solid var(--line)' }}
          >
            {order.name.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="truncate text-lg font-bold text-ink-0" style={{ letterSpacing: '-0.01em' }}>
                {order.company ?? order.name}
              </h1>
              <span className={['shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold', CUSTOM_STATUS_PILL[status]].join(' ')}>
                {CUSTOM_STATUS_LABELS[status]}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-ink-3">
              #{order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <a
            href={`/custom/${order.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-pill border border-[var(--line-2)] px-4 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-ink-1 sm:w-auto"
          >
            Suivi client
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3h6v6M11 3L3 11" />
            </svg>
          </a>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 7l3.5 3.5L12 4" />
            </svg>
            {successMsg}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">

          {/* ════ Colonne principale ════ */}
          <div className="space-y-5">

            {/* Statut */}
            <Card title="Statut">
              <div className="flex flex-wrap gap-2">
                {MANUAL_STATUSES.map((s) => {
                  const active = order.status === s
                  return (
                    <button
                      key={s}
                      disabled={saving || active}
                      onClick={() => updateField({ status: s })}
                      className="flex cursor-pointer items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default"
                      style={active ? {
                        background: `color-mix(in srgb, ${CUSTOM_STATUS_ACCENT[s]} 12%, transparent)`,
                        borderColor: `color-mix(in srgb, ${CUSTOM_STATUS_ACCENT[s]} 55%, transparent)`,
                        color: CUSTOM_STATUS_ACCENT[s],
                      } : { borderColor: 'var(--line-2)', color: 'var(--ink-2)' }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: CUSTOM_STATUS_ACCENT[s] }} />
                      {CUSTOM_STATUS_LABELS[s]}
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Projet */}
            <Card title="Projet">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <InfoItem label="Type" value={order.project_type} />
                  {order.budget_range && <InfoItem label="Budget" value={order.budget_range} />}
                  {order.deadline && <InfoItem label="Délai" value={order.deadline} />}
                </div>
                <div
                  className="rounded-xl p-4 text-sm leading-relaxed text-ink-1"
                  style={{ background: 'var(--hi-03)', border: '1px solid var(--line)' }}
                >
                  {order.description}
                </div>
                {order.reference_file_url && (
                  <a
                    href={order.reference_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-pill border border-amber/30 bg-amber/10 px-3.5 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/20"
                  >
                    📎 Voir le fichier de référence
                  </a>
                )}
              </div>
            </Card>

            {/* Devis & paiement */}
            <Card title="Devis & paiement">
              {quoteSent ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 7l3.5 3.5L12 4" />
                  </svg>
                  Devis envoyé — lien de paiement transmis par email.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                        Acompte (€) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={depositInput}
                        onChange={(e) => setDepositInput(e.target.value)}
                        placeholder="150"
                        className="w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                        Total estimé (€)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={totalInput}
                        onChange={(e) => setTotalInput(e.target.value)}
                        placeholder="350"
                        className="w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
                      />
                    </div>
                  </div>
                  {quoteError && <p className="text-xs text-red-400">{quoteError}</p>}
                  <button
                    onClick={sendQuote}
                    disabled={quoteLoading || !depositInput}
                    className="flex h-[42px] cursor-pointer items-center gap-2 rounded-pill px-5 text-[13px] font-bold text-bg-0 transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: 'var(--btn-primary-bg)' }}
                  >
                    {quoteLoading ? (
                      <>
                        <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" />
                        </svg>
                        Envoi en cours…
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2L2 6.5l5 2L9 14l5-12z" />
                        </svg>
                        Envoyer le devis + lien de paiement
                      </>
                    )}
                  </button>
                  {order.payment_url && (
                    <a
                      href={order.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-amber hover:underline"
                    >
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 3h6v6M11 3L3 11" />
                      </svg>
                      Voir le lien de paiement existant
                    </a>
                  )}
                </div>
              )}
            </Card>

            {/* Expédition */}
            <Card title="Expédition">
              {order.shipping_address ? (
                <div className="space-y-4">
                  <address className="text-[13px] not-italic leading-relaxed text-ink-1">
                    <span className="font-semibold text-ink-0">{order.shipping_name}</span><br />
                    {order.shipping_address}<br />
                    {order.shipping_postal_code} {order.shipping_city}
                  </address>
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Numéro de suivi</p>
                    <div className="flex gap-2">
                      <input
                        value={trackingNum}
                        onChange={(e) => setTrackingNum(e.target.value)}
                        placeholder="Numéro transporteur"
                        className="min-w-0 flex-1 rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
                      />
                      <button
                        onClick={() => updateField({ tracking_number: trackingNum, tracking_url: trackingUrl })}
                        disabled={saving}
                        className="cursor-pointer rounded-lg border border-[var(--line-2)] bg-bg-3 px-4 py-2 text-sm font-medium text-ink-1 transition-colors hover:border-[var(--line-amber)] hover:text-ink-0 disabled:opacity-40"
                      >
                        {saving ? '…' : 'Sauver'}
                      </button>
                    </div>
                    <input
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      placeholder="URL de suivi (optionnel)"
                      className="mt-2 w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-3">Aucune adresse de livraison renseignée.</p>
              )}
            </Card>
          </div>

          {/* ════ Colonne latérale ════ */}
          <div className="space-y-5">

            {/* Client */}
            <Card title="Client">
              <p className="text-sm font-semibold text-ink-0">{order.name}</p>
              {order.company && <p className="mt-0.5 text-xs text-ink-3">{order.company}</p>}
              <div className="mt-3 space-y-2">
                <a href={`mailto:${order.email}`} className="flex items-center gap-2 text-[13px] text-amber hover:underline">
                  <svg className="shrink-0 text-ink-3" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="M2 5l6 4 6-4" />
                  </svg>
                  <span className="truncate">{order.email}</span>
                </a>
                <a href={`tel:${order.phone}`} className="flex items-center gap-2 text-[13px] text-amber hover:underline">
                  <svg className="shrink-0 text-ink-3" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.5 2.5h2l1.3 3.3-1.6 1a7 7 0 003.3 3.3l1-1.6 3.3 1.3v2a1.3 1.3 0 01-1.3 1.3A10.7 10.7 0 012.2 3.8 1.3 1.3 0 013.5 2.5z" />
                  </svg>
                  {order.phone}
                </a>
              </div>
            </Card>

            {/* Finances */}
            {(order.deposit_amount || order.total_amount) && (
              <Card title="Finances">
                <div className="space-y-2 text-sm">
                  {order.deposit_amount && (
                    <div className="flex items-baseline justify-between">
                      <span className="text-ink-2">Acompte</span>
                      <span className="font-mono text-ink-1">{formatPrice(order.deposit_amount)}</span>
                    </div>
                  )}
                  {order.total_amount && (
                    <>
                      <div className="my-1 border-t border-dashed" style={{ borderColor: 'var(--line-amber)' }} />
                      <div className="flex items-baseline justify-between">
                        <span className="font-semibold text-amber">Total estimé</span>
                        <span className="font-mono text-base font-bold text-amber">{formatPrice(order.total_amount)}</span>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* Notes internes */}
            <Card title="Notes internes">
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                rows={4}
                placeholder="Notes de production, contraintes, todo…"
                className="w-full resize-none rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
              />
              <button
                onClick={() => updateField({ admin_notes: notesInput })}
                disabled={saving}
                className="mt-2 cursor-pointer rounded-lg border border-[var(--line-2)] bg-bg-3 px-4 py-2 text-sm text-ink-1 transition-colors hover:border-[var(--line-amber)] hover:text-ink-0 disabled:opacity-40"
              >
                {saving ? 'Sauvegarde…' : 'Sauvegarder les notes'}
              </button>
            </Card>

            {/* Lien suivi client */}
            <Card title="Lien de suivi client">
              <p className="break-all font-mono text-xs leading-relaxed text-ink-2">{suiviUrl}</p>
              <button
                onClick={() => navigator.clipboard.writeText(suiviUrl)}
                className="mt-2.5 flex cursor-pointer items-center gap-1.5 text-xs font-medium text-amber transition-colors hover:text-amber-soft"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="5" width="7" height="7" rx="1.2" /><path d="M9 5V3.2A1.2 1.2 0 007.8 2H3.2A1.2 1.2 0 002 3.2v4.6A1.2 1.2 0 003.2 9H5" />
                </svg>
                Copier le lien
              </button>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-1">
      <header className="border-b border-[var(--line)] px-4 py-3 sm:px-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{title}</h2>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-1 text-[13px] text-ink-1">{value}</p>
    </div>
  )
}
