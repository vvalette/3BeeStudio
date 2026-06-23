'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ORDER_STATUS_LABELS, isVCard, calcOrder, type Order, type OrderStatus } from '@/types/order'
import { formatPrice } from '@/lib/utils'
import { STATUS_PILL, STATUS_ACCENT } from '@/lib/status-ui'
import { DestinationIcon } from '@/components/nfc/NfcLinkPicker'

// Statuts modifiables à la main par l'admin.
const MANUAL_STATUSES: OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'processing',
  'cancelled',
]

// Statuts pilotés automatiquement par le suivi Boxtal (non modifiables à la main).
const AUTO_STATUSES: OrderStatus[] = ['shipped', 'delivered']

export default function AdminOrderDetail({ order: initialOrder }: { order: Order }) {
  const [order, setOrder] = useState(initialOrder)
  const [saving, setSaving] = useState(false)
  const [trackingInput, setTrackingInput] = useState(order.tracking_number ?? '')
  const [notesInput, setNotesInput] = useState(order.admin_notes ?? '')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [shipping, setShipping] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)
  const [labelUrl, setLabelUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState<'nfc' | 'link' | null>(null)
  const router = useRouter()

  const status = order.status as OrderStatus
  const suiviUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'}/suivi/${order.id}`

  function copy(text: string, key: 'nfc' | 'link') {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  async function generateLabel() {
    setShipping(true)
    setShippingError(null)
    setLabelUrl(null)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/ship`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setLabelUrl(json.label_url)
      setOrder(o => ({ ...o, boxtal_order_id: json.boxtal_order_id }))
      router.refresh()
    } catch (e) {
      setShippingError(e instanceof Error ? e.message : 'Erreur Boxtal')
    } finally {
      setShipping(false)
    }
  }

  async function updateField(updates: Partial<Order>) {
    setSaving(true)
    setSuccessMsg(null)
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const updated = await res.json()
        setOrder(updated)
        setSuccessMsg('Sauvegardé')
        setTimeout(() => setSuccessMsg(null), 2000)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-10">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/admin/commandes"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line-2)] bg-bg-1 text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-amber"
            aria-label="Retour à la liste"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 7H3M3 7l3.5-3.5M3 7l3.5 3.5" />
            </svg>
          </Link>

          {/* Logo client */}
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'var(--hi-04)', border: '1px solid var(--line)' }}
          >
            {order.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={order.logo_url} alt="" className="h-9 w-9 object-contain" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" strokeWidth="1.3">
                <rect x="2" y="2" width="12" height="12" rx="2" /><circle cx="6" cy="6" r="1.3" /><path d="M2 11l3.5-3.5L9 11l2.5-2.5L14 11" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-lg font-bold text-ink-0" style={{ letterSpacing: '-0.01em' }}>
                {order.company}
              </h1>
              <span className={['shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold', STATUS_PILL[status]].join(' ')}>
                {ORDER_STATUS_LABELS[status]}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-ink-3">
              #{order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}{' '}
              {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <a
            href={suiviUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-pill border border-[var(--line-2)] px-4 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-ink-1"
          >
            Suivi client
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3h6v6M11 3L3 11" />
            </svg>
          </a>
        </div>

        {/* Toast sauvegarde */}
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
            <Card title="Statut de production">
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
                        background: `color-mix(in srgb, ${STATUS_ACCENT[s]} 12%, transparent)`,
                        borderColor: `color-mix(in srgb, ${STATUS_ACCENT[s]} 55%, transparent)`,
                        color: STATUS_ACCENT[s],
                      } : {
                        borderColor: 'var(--line-2)',
                        color: 'var(--ink-2)',
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_ACCENT[s] }} />
                      {ORDER_STATUS_LABELS[s]}
                    </button>
                  )
                })}
              </div>

              {/* Statuts automatiques (suivi Boxtal) */}
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3.5">
                {AUTO_STATUSES.map((s) => {
                  const active = order.status === s
                  return (
                    <span
                      key={s}
                      className="flex items-center gap-1.5 rounded-pill border border-dashed px-3 py-1.5 text-xs font-medium"
                      style={active ? {
                        background: `color-mix(in srgb, ${STATUS_ACCENT[s]} 12%, transparent)`,
                        borderColor: `color-mix(in srgb, ${STATUS_ACCENT[s]} 55%, transparent)`,
                        color: STATUS_ACCENT[s],
                      } : {
                        borderColor: 'var(--line-2)',
                        color: 'var(--ink-3)',
                        opacity: 0.7,
                      }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_ACCENT[s] }} />
                      {ORDER_STATUS_LABELS[s]}
                    </span>
                  )
                })}
                <span className="flex items-center gap-1 text-[11px] text-ink-3">
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3">
                    <rect x="2.5" y="6" width="9" height="6" rx="1.2" /><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" strokeLinecap="round" />
                  </svg>
                  Auto via le suivi Boxtal
                </span>
              </div>
            </Card>

            {/* Production */}
            <Card title="À produire">
              <div className="flex flex-wrap items-center gap-5">
                {/* Logo */}
                <div className="flex flex-col items-center gap-2">
                  <div
                    className="flex h-24 w-24 items-center justify-center rounded-xl"
                    style={{ background: 'var(--hi-05)', border: '1px solid var(--line-2)' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={order.logo_url} alt={`Logo ${order.company}`} className="h-20 w-20 object-contain" />
                  </div>
                  <a
                    href={order.logo_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] font-medium text-amber hover:underline"
                  >
                    <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 2v7M7 9L4 6M7 9l3-3M2.5 11.5h9" />
                    </svg>
                    Télécharger le SVG
                  </a>
                </div>

                {/* Quantité */}
                <div
                  className="flex flex-col items-center rounded-xl px-5 py-3.5"
                  style={{ background: 'var(--hi-04)', border: '1px solid var(--line)' }}
                >
                  <span className="font-mono text-2xl font-bold leading-tight text-ink-0">×{order.quantity}</span>
                  <span className="mt-0.5 text-[10px] text-ink-3">porte-clés</span>
                </div>
              </div>

              {/* Destination à programmer sur la puce */}
              <div
                className="mt-4 rounded-xl p-4"
                style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber">
                    <DestinationIcon value={order.nfc_url} size={12} />
                    À programmer sur la puce {isVCard(order.nfc_url) ? '· vCard' : '· URL'}
                  </span>
                  <button
                    onClick={() => copy(order.nfc_url, 'nfc')}
                    className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-amber transition-colors hover:text-amber-soft"
                  >
                    {copied === 'nfc' ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7l3.5 3.5L12 4" /></svg>
                        Copié
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="7" height="7" rx="1.2" /><path d="M9 5V3.2A1.2 1.2 0 007.8 2H3.2A1.2 1.2 0 002 3.2v4.6A1.2 1.2 0 003.2 9H5" /></svg>
                        Copier
                      </>
                    )}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-ink-1">{order.nfc_url}</pre>
                {!isVCard(order.nfc_url) && (
                  <a
                    href={order.nfc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber/70 hover:text-amber hover:underline"
                  >
                    Tester le lien
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h6v6M11 3L3 11" /></svg>
                  </a>
                )}
              </div>
            </Card>

            {/* Expédition */}
            <Card
              title="Expédition"
              right={order.boxtal_order_id ? <span className="font-mono text-[10px] text-ink-3">{order.boxtal_order_id}</span> : undefined}
            >
              {!order.shipping_address ? (
                <p className="text-xs text-amber/70">
                  Adresse de livraison manquante (commande passée avant la mise à jour du formulaire).
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Adresse */}
                  <address className="text-[13px] not-italic leading-relaxed text-ink-1">
                    <span className="font-semibold text-ink-0">{order.shipping_name}</span><br />
                    {order.shipping_address}{order.shipping_address2 ? <>, {order.shipping_address2}</> : null}<br />
                    {order.shipping_postal_code} {order.shipping_city}
                    <span className="ml-1.5 text-[11px] uppercase text-ink-3">({order.shipping_country})</span>
                  </address>

                  {shippingError && <p className="text-xs text-red-400">{shippingError}</p>}

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={generateLabel}
                      disabled={shipping}
                      className="flex h-[38px] cursor-pointer items-center gap-2 rounded-pill px-4 text-xs font-bold text-bg-0 transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: 'var(--btn-primary-bg)' }}
                    >
                      {shipping ? (
                        <>
                          <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" />
                          </svg>
                          Génération…
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8.6 1.5H14v5.4l-7 7-5.4-5.4 7-7z" /><circle cx="11" cy="4.6" r="1" fill="currentColor" stroke="none" />
                          </svg>
                          {order.boxtal_order_id ? 'Ré-télécharger l’étiquette' : 'Générer l’étiquette Boxtal'}
                        </>
                      )}
                    </button>

                    {labelUrl && (
                      <a
                        href={labelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-[38px] items-center gap-1.5 rounded-pill border border-emerald-500/30 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                      >
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 2v7M7 9L4 6M7 9l3-3M2.5 11.5h9" />
                        </svg>
                        Étiquette PDF
                      </a>
                    )}
                  </div>

                  {/* Suivi manuel */}
                  <div className="border-t border-[var(--line)] pt-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Numéro de suivi</p>
                    <div className="flex gap-2">
                      <input
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                        placeholder="Numéro de suivi transporteur"
                        className="flex-1 rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
                      />
                      <button
                        onClick={() => updateField({ tracking_number: trackingInput })}
                        disabled={saving}
                        className="cursor-pointer rounded-lg border border-[var(--line-2)] bg-bg-3 px-4 py-2 text-sm font-medium text-ink-1 transition-colors hover:border-[var(--line-amber)] hover:text-ink-0 disabled:opacity-40"
                      >
                        {saving ? '…' : 'Sauver'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* ════ Colonne latérale ════ */}
          <div className="space-y-5">

            {/* Client */}
            <Card title="Client">
              <p className="text-sm font-semibold text-ink-0">{order.company}</p>
              <p className="mt-0.5 text-xs text-ink-3">{order.sector}</p>
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

            {/* Paiement */}
            <Card title="Paiement">
              <div className="space-y-2 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-ink-2">
                    Sous-total <span className="font-mono text-xs text-ink-3">{order.quantity} × {formatPrice(order.unit_price)}</span>
                  </span>
                  <span className="font-mono text-ink-1">{formatPrice(order.unit_price * order.quantity)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-ink-2">Livraison</span>
                  {calcOrder(order.quantity).shipping === 0 ? (
                    <span className="font-mono font-semibold text-emerald-400">Offerte</span>
                  ) : (
                    <span className="font-mono text-ink-1">{formatPrice(calcOrder(order.quantity).shipping)}</span>
                  )}
                </div>
                <div className="my-1 border-t border-dashed" style={{ borderColor: 'var(--line-amber)' }} />
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-amber">Total payé</span>
                  <span className="font-mono text-base font-bold text-amber">{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            </Card>

            {/* Notes internes */}
            <Card title="Notes internes">
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                rows={4}
                placeholder="Notes de production, remarques, todo…"
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
                onClick={() => copy(`${window.location.origin}/suivi/${order.id}`, 'link')}
                className="mt-2.5 flex cursor-pointer items-center gap-1.5 text-xs font-medium text-amber transition-colors hover:text-amber-soft"
              >
                {copied === 'link' ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7l3.5 3.5L12 4" /></svg>
                    Copié
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="7" height="7" rx="1.2" /><path d="M9 5V3.2A1.2 1.2 0 007.8 2H3.2A1.2 1.2 0 002 3.2v4.6A1.2 1.2 0 003.2 9H5" /></svg>
                    Copier le lien
                  </>
                )}
              </button>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}

// ─── Carte de section ─────────────────────────────────────────────────────────

function Card({ title, right, children }: {
  title: string; right?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-1">
      <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{title}</h2>
        {right}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}
