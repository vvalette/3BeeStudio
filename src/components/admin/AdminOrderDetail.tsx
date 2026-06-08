'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ORDER_STATUS_LABELS, ORDER_STATUS_STEPS, isVCard, calcOrder, type Order, type OrderStatus } from '@/types/order'
import { formatPrice } from '@/lib/utils'

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: 'bg-zinc-500/20 text-zinc-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-purple-500/20 text-purple-400',
  printing: 'bg-orange-500/20 text-orange-400',
  printed: 'bg-lime-500/20 text-lime-400',
  shipped: 'bg-cyan-500/20 text-cyan-400',
  delivered: 'bg-emerald-500/20 text-emerald-400',
}

// Statuts modifiables à la main par l'admin.
const MANUAL_STATUSES: OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'processing',
  'printing',
  'printed',
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
  const router = useRouter()

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
        setSuccessMsg('Sauvegardé ✓')
        setTimeout(() => setSuccessMsg(null), 2000)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-8">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/commandes" className="text-ink-3 hover:text-amber transition-colors text-sm">
            ← Retour
          </Link>
          <div>
            <h1 className="text-lg font-bold text-ink-0">{order.company}</h1>
            <p className="font-mono text-xs text-ink-3">{order.id}</p>
          </div>
        </div>

        {successMsg && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
            {successMsg}
          </div>
        )}

        {/* Statut */}
        <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-0">Statut</h2>
            <span className={['rounded-pill px-3 py-1 text-xs font-semibold', STATUS_COLORS[order.status as OrderStatus]].join(' ')}>
              {ORDER_STATUS_LABELS[order.status as OrderStatus]}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {MANUAL_STATUSES.map((s) => (
              <button
                key={s}
                disabled={saving || order.status === s}
                onClick={() => updateField({ status: s })}
                className={[
                  'cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default',
                  order.status === s
                    ? 'border-amber bg-amber/10 text-amber'
                    : 'border-[var(--line-2)] text-ink-2 hover:border-amber/40 hover:text-ink-1',
                ].join(' ')}
              >
                {ORDER_STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Statuts automatiques (suivi Boxtal) — non modifiables à la main */}
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
            {AUTO_STATUSES.map((s) => (
              <span
                key={s}
                className={[
                  'rounded-lg border border-dashed px-3 py-1.5 text-xs font-medium',
                  order.status === s
                    ? 'border-amber/50 bg-amber/10 text-amber'
                    : 'border-[var(--line-2)] text-ink-3 opacity-60',
                ].join(' ')}
              >
                {ORDER_STATUS_LABELS[s]}
              </span>
            ))}
            <span className="text-[11px] text-ink-3">🔒 Auto via le suivi Boxtal</span>
          </div>
        </div>

        {/* Infos client */}
        <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink-0">Client</h2>
          <div className="divide-y divide-[var(--line)]">
            <Row label="Entreprise" value={order.company} />
            <Row label="Email" value={<a href={`mailto:${order.email}`} className="text-amber hover:underline">{order.email}</a>} />
            <Row label="Téléphone" value={<a href={`tel:${order.phone}`} className="text-amber hover:underline">{order.phone}</a>} />
            <Row label="Secteur" value={order.sector} />
            <Row label="Date" value={new Date(order.created_at).toLocaleString('fr-FR')} />
          </div>
        </div>

        {/* Commande */}
        <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink-0">Commande</h2>
          <div className="divide-y divide-[var(--line)]">
            <Row label="Quantité" value={`${order.quantity} porte-clés`} />
            <Row label="Prix unitaire" value={formatPrice(order.unit_price)} />
            <Row label="Livraison" value={calcOrder(order.quantity).shipping === 0 ? 'Offerte' : formatPrice(calcOrder(order.quantity).shipping)} />
            <Row label="Total payé" value={formatPrice(order.total_amount)} />
          </div>

          {/* Destination à programmer sur la puce */}
          <NfcDestination value={order.nfc_url} />

          {/* Logo */}
          <div className="pt-2">
            <p className="text-xs text-ink-3 mb-2">Logo client</p>
            <img
              src={order.logo_url}
              alt={`Logo ${order.company}`}
              className="h-20 w-auto rounded-lg border border-[var(--line)] bg-white/5 object-contain p-2"
            />
            <a
              href={order.logo_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-xs text-amber hover:underline"
            >
              Télécharger →
            </a>
          </div>
        </div>

        {/* Boxtal — génération étiquette */}
        <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-0">Expédition Boxtal</h2>
            {order.boxtal_order_id && (
              <span className="font-mono text-[10px] text-ink-3">{order.boxtal_order_id}</span>
            )}
          </div>

          {!order.shipping_address ? (
            <p className="text-xs text-amber/70">Adresse de livraison manquante (commande passée avant la mise à jour du formulaire).</p>
          ) : (
            <>
              <div className="text-xs text-ink-2 space-y-0.5">
                <p>{order.shipping_name}</p>
                <p>{order.shipping_address}{order.shipping_address2 ? `, ${order.shipping_address2}` : ''}</p>
                <p>{order.shipping_postal_code} {order.shipping_city} ({order.shipping_country})</p>
              </div>

              {shippingError && (
                <p className="text-xs text-red-400">{shippingError}</p>
              )}

              {labelUrl && (
                <a
                  href={labelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  ↓ Télécharger l&apos;étiquette PDF
                </a>
              )}

              <button
                onClick={generateLabel}
                disabled={shipping}
                className="flex h-[40px] cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-bold text-bg-0 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: 'var(--btn-primary-bg)' }}
              >
                {shipping ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
                    </svg>
                    Génération...
                  </>
                ) : order.boxtal_order_id ? (
                  '↻ Ré-télécharger l\'étiquette'
                ) : (
                  '📦 Générer l\'étiquette Boxtal'
                )}
              </button>
            </>
          )}
        </div>

        {/* Suivi manuel */}
        <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink-0">Numéro de suivi</h2>
          <div className="flex gap-2">
            <input
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              placeholder="Numéro de suivi transporteur"
              className="flex-1 rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none font-mono"
            />
            <button
              onClick={() => updateField({ tracking_number: trackingInput })}
              disabled={saving}
              className="rounded-lg bg-amber px-4 py-2 text-sm font-bold text-bg-0 hover:bg-amber-soft disabled:opacity-40 transition-opacity"
            >
              {saving ? '...' : 'Sauver'}
            </button>
          </div>
        </div>

        {/* Notes admin */}
        <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-6 space-y-3">
          <h2 className="text-sm font-semibold text-ink-0">Notes internes</h2>
          <textarea
            value={notesInput}
            onChange={(e) => setNotesInput(e.target.value)}
            rows={4}
            placeholder="Notes de production, remarques, todo..."
            className="w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none resize-none"
          />
          <button
            onClick={() => updateField({ admin_notes: notesInput })}
            disabled={saving}
            className="rounded-lg bg-bg-3 border border-[var(--line-2)] px-4 py-2 text-sm text-ink-1 hover:text-ink-0 disabled:opacity-40 transition-colors"
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder les notes'}
          </button>
        </div>

        {/* Lien suivi client */}
        <div className="rounded-xl border border-[var(--line)] bg-bg-1 p-4">
          <p className="text-xs text-ink-3 mb-1">Lien de suivi client</p>
          <p className="font-mono text-xs text-ink-2 break-all">
            {process.env.NEXT_PUBLIC_APP_URL}/suivi/{order.id}
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/suivi/${order.id}`)}
            className="mt-2 text-xs text-amber hover:underline"
          >
            Copier le lien
          </button>
        </div>
      </div>
    </main>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-xs text-ink-3 shrink-0">{label}</span>
      <span className="text-xs text-right text-ink-1">{value}</span>
    </div>
  )
}

// Bloc destination NFC : ce que le studio doit programmer sur la puce.
function NfcDestination({ value }: { value: string }) {
  const vcard = isVCard(value)
  return (
    <div
      className="mt-1 rounded-xl p-4"
      style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-amber">
          À programmer sur la puce {vcard ? '· vCard' : '· URL'}
        </span>
        <button
          onClick={() => navigator.clipboard.writeText(value)}
          className="text-[11px] text-amber hover:underline"
        >
          Copier
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-all font-mono text-xs text-ink-1">{value}</pre>
      {!vcard && (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[11px] text-amber/70 hover:underline"
        >
          Tester le lien →
        </a>
      )}
    </div>
  )
}
