'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SHOP_STATUS_LABELS, type ShopOrder, type ShopOrderStatus } from '@/types/shop-order'
import { formatPrice } from '@/lib/utils'
import { estimateShopPackage, volumetricWeight } from '@/lib/boxtal'
import { SHOP_STATUS_PILL, SHOP_STATUS_ACCENT } from '@/lib/status-ui'
import { useConfirm } from '@/components/ui/ConfirmModal'
import { useAdminMutation } from './useAdminMutation'
import AdminFeedback, { UnsavedDot } from './AdminFeedback'
import useUnsavedWarning from './useUnsavedWarning'

// Statuts du déroulé normal, pilotés par l'admin.
const MANUAL_STATUSES: ShopOrderStatus[] = ['pending_payment', 'confirmed', 'processing']

// Statuts normalement renseignés par le suivi Boxtal, mais forçables à la main :
// une étiquette créée hors API (back-office Boxtal, retrait studio) n'émet aucun
// événement de suivi, la commande resterait sinon bloquée en préparation.
const AUTO_STATUSES: ShopOrderStatus[] = ['shipped', 'delivered']

export default function AdminShopOrderDetail({ order: initialOrder }: { order: ShopOrder }) {
  const [order, setOrder] = useState(initialOrder)
  const { mutate, loading: saving, error: mutationError, success: successMsg, flashSuccess, clear } = useAdminMutation()
  const [trackingInput, setTrackingInput] = useState(order.tracking_number ?? '')
  const [notesInput, setNotesInput] = useState(order.admin_notes ?? '')
  const [shipping, setShipping] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)
  const [labelUrl, setLabelUrl] = useState<string | null>(null)
  const [linkInput, setLinkInput] = useState(order.boxtal_order_id ?? '')
  const [linking, setLinking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [editingLink, setEditingLink] = useState(false)
  const [copied, setCopied] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelResult, setCancelResult] = useState<{ stripeRefunded: boolean; boxtalCancelled: boolean; boxtalError: string | null } | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()
  const { confirm, modal } = useConfirm()

  const status = order.status
  const isPickup = order.delivery_mode === 'pickup'
  const isRelay  = order.delivery_mode === 'relay'

  // Le colis déclaré à Boxtal. Affiché AVANT génération : les transporteurs
  // facturent au max(poids réel, volumétrique), donc un weight_grams produit
  // erroné se paie cash sur l'étiquette.
  const pkg     = estimateShopPackage(order.items ?? [])
  const volume  = volumetricWeight(pkg)
  const billed  = Math.max(pkg.weight, volume)
  const suiviUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'}/boutique/suivi/${order.id}`

  // Champs sans autosave : on signale la saisie non enregistrée plutôt que de la
  // perdre silencieusement au changement de page.
  const trackingDirty = trackingInput !== (order.tracking_number ?? '')
  const notesDirty    = notesInput !== (order.admin_notes ?? '')
  useUnsavedWarning(trackingDirty || notesDirty)

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/boutique/suivi/${order.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  async function generateLabel() {
    setShipping(true)
    setShippingError(null)
    setLabelUrl(null)
    try {
      const res = await fetch(`/api/admin/boutique/orders/${order.id}/ship`, { method: 'POST' })
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

  // Rattache une expédition créée à la main dans le back-office Boxtal :
  // l'id est validé côté serveur, le suivi et le coût sont rapatriés dans la foulée.
  async function linkShipment() {
    const value = linkInput.trim()
    if (!value) return
    setLinking(true)
    setLinkError(null)
    try {
      const res = await fetch(`/api/admin/boutique/orders/${order.id}/link-shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boxtal_order_id: value }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setOrder(json.order)
      setTrackingInput(json.order.tracking_number ?? '')
      setEditingLink(false)
      flashSuccess(json.tracking_found
        ? 'Expédition rattachée — suivi récupéré'
        : 'Expédition rattachée — suivi pas encore disponible chez Boxtal')
      router.refresh()
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : 'Erreur Boxtal')
    } finally {
      setLinking(false)
    }
  }

  async function cancelOrder() {
    if (!await confirm({ title: 'Annuler cette commande ?', message: 'Le client sera remboursé sur Stripe si le paiement a été encaissé.', confirmLabel: 'Annuler la commande', variant: 'danger' })) return
    setCancelling(true)
    setCancelError(null)
    setCancelResult(null)
    try {
      const res = await fetch(`/api/admin/boutique/orders/${order.id}/cancel`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setCancelResult(json)
      setOrder(o => ({ ...o, status: 'cancelled' }))
      router.refresh()
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setCancelling(false)
    }
  }

  async function deleteOrder() {
    const refundMsg = order.status !== 'pending_payment' && order.status !== 'cancelled'
      ? 'Le client sera remboursé sur Stripe si le paiement a été encaissé.' : undefined
    if (!await confirm({ title: 'Supprimer définitivement ?', message: refundMsg, confirmLabel: 'Supprimer', variant: 'danger' })) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/boutique/orders/${order.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push('/admin/commandes')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Erreur inconnue')
      setDeleting(false)
    }
  }

  // `shipment_email_sent` est renvoyé par la route : il vaut true uniquement sur la
  // vraie transition vers « expédiée », donc le message ne ment jamais.
  async function updateField(updates: Partial<ShopOrder>, successMessage = 'Sauvegardé') {
    const updated = await mutate<ShopOrder & { shipment_email_sent?: boolean }>(
      `/api/admin/boutique/orders/${order.id}`,
      { body: updates, successMessage },
    )
    if (!updated) return
    setOrder(updated)
    if (updated.shipment_email_sent) {
      flashSuccess('Statut enregistré — email d’expédition envoyé au client')
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

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--hi-04)', border: '1px solid var(--line)' }}>
            <span className="font-mono text-sm font-bold text-ink-2">{order.name.slice(0, 2).toUpperCase()}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="truncate text-lg font-bold text-ink-0" style={{ letterSpacing: '-0.01em' }}>{order.name}</h1>
              <span className={['shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold', SHOP_STATUS_PILL[status]].join(' ')}>
                {SHOP_STATUS_LABELS[status]}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-ink-3">
              #{order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}{' '}
              {new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <a href={suiviUrl} target="_blank" rel="noopener noreferrer"
            className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-pill border border-[var(--line-2)] px-4 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-ink-1 sm:w-auto">
            Suivi client
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3h6v6M11 3L3 11" /></svg>
          </a>
        </div>

        <AdminFeedback error={mutationError} success={successMsg} onDismiss={clear} />

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">

          {/* ════ Colonne principale ════ */}
          <div className="space-y-5">

            {/* Statut */}
            <Card title="Statut de commande">
              <div className="flex flex-wrap gap-2">
                {MANUAL_STATUSES.map((s) => {
                  const active = order.status === s
                  return (
                    <button key={s} disabled={saving || active} onClick={() => updateField({ status: s })}
                      className="flex cursor-pointer items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default"
                      style={active ? {
                        background: `color-mix(in srgb, ${SHOP_STATUS_ACCENT[s]} 12%, transparent)`,
                        borderColor: `color-mix(in srgb, ${SHOP_STATUS_ACCENT[s]} 55%, transparent)`,
                        color: SHOP_STATUS_ACCENT[s],
                      } : { borderColor: 'var(--line-2)', color: 'var(--ink-2)' }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: SHOP_STATUS_ACCENT[s] }} />
                      {SHOP_STATUS_LABELS[s]}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3.5">
                {AUTO_STATUSES.map((s) => {
                  const active = order.status === s
                  return (
                    <button key={s} disabled={saving || active} onClick={() => updateField({ status: s })}
                      className="flex cursor-pointer items-center gap-1.5 rounded-pill border border-dashed px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default"
                      style={active ? {
                        background: `color-mix(in srgb, ${SHOP_STATUS_ACCENT[s]} 12%, transparent)`,
                        borderColor: `color-mix(in srgb, ${SHOP_STATUS_ACCENT[s]} 55%, transparent)`,
                        color: SHOP_STATUS_ACCENT[s],
                      } : { borderColor: 'var(--line-2)', color: 'var(--ink-3)' }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: SHOP_STATUS_ACCENT[s] }} />
                      {SHOP_STATUS_LABELS[s]}
                    </button>
                  )
                })}
                <span className="flex items-center gap-1 text-[11px] text-ink-3">
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 7h11M9.5 4l3 3-3 3" /></svg>
                  Renseignés par le suivi Boxtal — cliquez pour forcer
                </span>
              </div>
            </Card>

            {/* Articles */}
            <Card title="Articles commandés">
              <ul className="space-y-4">
                {order.items.map((item, i) => (
                  <li key={i} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-ink-1">
                        <span className="font-mono text-ink-3">{item.quantity}×</span> {item.product_name}
                      </span>
                      <span className="font-mono text-ink-2">{formatPrice(item.unit_price * item.quantity)}</span>
                    </div>
                    {item.custom_field_values && item.custom_field_values.length > 0 && (
                      <ul className="ml-4 space-y-1 rounded-lg border border-[var(--line-amber)] bg-amber/5 px-3 py-2">
                        {item.custom_field_values.map((cfv) => (
                          <li key={cfv.key} className="flex items-baseline gap-2 text-[12px]">
                            <span className="shrink-0 text-ink-3">{cfv.label} :</span>
                            <span className="font-semibold text-ink-0">{cfv.value}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Expédition */}
            <Card title={isPickup ? 'Retrait en studio' : isRelay ? 'Expédition — point relais' : 'Expédition'}
              right={order.boxtal_order_id ? <span className="font-mono text-[10px] text-ink-3">{order.boxtal_order_id}</span> : undefined}>
              {isPickup ? (
                <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <p className="text-[13px] font-semibold text-amber">Retrait sur place — pas d&apos;expédition</p>
                  <p className="mt-1.5 text-[13px] text-ink-2">Le client récupère sa commande à l&apos;atelier. Contactez-le pour convenir d&apos;un créneau.</p>
                </div>
              ) : !order.shipping_address ? (
                <p className="text-xs text-amber/70">Adresse de livraison manquante.</p>
              ) : (
                <div className="space-y-4">
                  {isRelay && order.pickup_point_name && (
                    <div className="rounded-xl border border-amber/25 bg-amber/5 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber">Point relais choisi par le client</p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-1">
                        <span className="font-semibold text-ink-0">{order.pickup_point_name}</span><br />
                        {order.pickup_point_street}<br />
                        {order.pickup_point_postal_code} {order.pickup_point_city}
                      </p>
                      <p className="mt-1.5 font-mono text-[11px] text-ink-3">Code Boxtal : {order.pickup_point_code}</p>
                    </div>
                  )}
                  <address className="text-[13px] not-italic leading-relaxed text-ink-1">
                    <span className="font-semibold text-ink-0">{order.shipping_name}</span><br />
                    {order.shipping_address}{order.shipping_address2 ? <>, {order.shipping_address2}</> : null}<br />
                    {order.shipping_postal_code} {order.shipping_city}
                    <span className="ml-1.5 text-[11px] uppercase text-ink-3">({order.shipping_country})</span>
                  </address>

                  {!order.boxtal_order_id && (
                    <div className="rounded-xl border border-[var(--line)] bg-bg-2 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">Colis qui sera déclaré</p>
                      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[12px] text-ink-1">
                        <span>{pkg.weight} kg</span>
                        <span className="text-ink-3">{pkg.length} × {pkg.width} × {pkg.height} cm</span>
                        <span className={volume > pkg.weight ? 'text-amber' : 'text-ink-3'}>
                          vol. {volume} kg
                        </span>
                        <span className="font-semibold text-ink-0">facturé ~{billed} kg</span>
                      </div>
                      {volume > pkg.weight && (
                        <p className="mt-1.5 text-[11px] leading-snug text-amber">
                          Le volume prime sur le poids : c&apos;est {billed} kg qui sera facturé.
                          Vérifiez le poids des produits si ça vous semble trop.
                        </p>
                      )}
                    </div>
                  )}

                  {shippingError && <p className="text-xs text-red-400">{shippingError}</p>}

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button onClick={generateLabel} disabled={shipping}
                      className="flex h-[38px] cursor-pointer items-center gap-2 rounded-pill px-4 text-xs font-bold text-bg-0 transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: 'var(--btn-primary-bg)' }}>
                      {shipping ? (
                        <>
                          <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" /></svg>
                          Génération…
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.6 1.5H14v5.4l-7 7-5.4-5.4 7-7z" /><circle cx="11" cy="4.6" r="1" fill="currentColor" stroke="none" /></svg>
                          {order.boxtal_order_id ? 'Ré-télécharger l’étiquette' : 'Générer l’étiquette Boxtal'}
                        </>
                      )}
                    </button>

                    {labelUrl && (
                      <a href={labelUrl} target="_blank" rel="noopener noreferrer"
                        className="flex h-[38px] items-center gap-1.5 rounded-pill border border-emerald-500/30 bg-emerald-500/10 px-4 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20">
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2v7M7 9L4 6M7 9l3-3M2.5 11.5h9" /></svg>
                        Étiquette PDF
                      </a>
                    )}
                  </div>

                  {/* Rattrapage : expédition créée par l'API mais id non enregistré
                      (échec de l'update après création). Vérifié le 10 août 2026 :
                      l'API v3.1 n'expose PAS les expéditions faites à la main dans le
                      back-office Boxtal — pour celles-là, seul le champ suivi ci-dessous
                      est utilisable. */}
                  {order.boxtal_order_id && !editingLink ? (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-3">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 7l3.5 3.5L12 4" /></svg>
                        Expédition Boxtal rattachée
                      </span>
                      <button onClick={() => { setLinkInput(order.boxtal_order_id ?? ''); setLinkError(null); setEditingLink(true) }}
                        className="cursor-pointer underline underline-offset-2 transition-colors hover:text-ink-1">
                        Modifier le lien
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[var(--line)] bg-bg-2 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                        {editingLink ? 'Modifier l’expédition rattachée' : 'Rattacher une expédition Boxtal'}
                      </p>
                      <p className="mt-1.5 text-[11px] leading-snug text-ink-3">
                        Pour une expédition créée <strong className="font-semibold text-ink-2">par l’API</strong> dont
                        l’identifiant n’a pas été enregistré : suivi, statuts et re-téléchargement de l’étiquette
                        repassent en automatique. Une étiquette faite à la main dans le back-office Boxtal n’est
                        pas exposée par l’API — utilisez le champ suivi ci-dessous.
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <input value={linkInput} onChange={(e) => setLinkInput(e.target.value)}
                          placeholder="Identifiant d’expédition Boxtal"
                          className="min-w-0 flex-1 rounded-lg border border-[var(--line-2)] bg-bg-1 px-3 py-2 font-mono text-[12px] text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none" />
                        <button onClick={linkShipment} disabled={linking || !linkInput.trim()}
                          className="shrink-0 cursor-pointer rounded-lg border border-[var(--line-2)] bg-bg-3 px-4 py-2 text-sm font-medium text-ink-1 transition-colors hover:border-[var(--line-amber)] hover:text-ink-0 disabled:cursor-not-allowed disabled:opacity-40">
                          {linking ? '…' : 'Lier'}
                        </button>
                        {editingLink && (
                          <button onClick={() => { setEditingLink(false); setLinkError(null) }}
                            className="shrink-0 cursor-pointer rounded-lg px-2 text-[12px] text-ink-3 transition-colors hover:text-ink-1">
                            Annuler
                          </button>
                        )}
                      </div>
                      {linkError && <p className="mt-2 text-xs text-red-400">{linkError}</p>}
                    </div>
                  )}

                  <div className="border-t border-[var(--line)] pt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Numéro de suivi</p>
                      {trackingDirty && <UnsavedDot />}
                    </div>
                    <div className="flex gap-2">
                      <input value={trackingInput} onChange={(e) => setTrackingInput(e.target.value)} placeholder="Numéro de suivi transporteur"
                        className={[
                          'min-w-0 flex-1 rounded-lg border bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none',
                          trackingDirty ? 'border-amber/50' : 'border-[var(--line-2)] focus:border-amber/50',
                        ].join(' ')} />
                      <button onClick={() => updateField({ tracking_number: trackingInput })} disabled={saving || !trackingDirty}
                        className="cursor-pointer rounded-lg border border-[var(--line-2)] bg-bg-3 px-4 py-2 text-sm font-medium text-ink-1 transition-colors hover:border-[var(--line-amber)] hover:text-ink-0 disabled:cursor-default disabled:opacity-40">
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
              <p className="text-sm font-semibold text-ink-0">{order.name}</p>
              <div className="mt-3 space-y-2">
                <a href={`mailto:${order.email}`} className="flex items-center gap-2 text-[13px] text-amber hover:underline">
                  <svg className="shrink-0 text-ink-3" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="M2 5l6 4 6-4" /></svg>
                  <span className="truncate">{order.email}</span>
                </a>
                {order.phone && (
                  <a href={`tel:${order.phone}`} className="flex items-center gap-2 text-[13px] text-amber hover:underline">
                    <svg className="shrink-0 text-ink-3" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 2.5h2l1.3 3.3-1.6 1a7 7 0 003.3 3.3l1-1.6 3.3 1.3v2a1.3 1.3 0 01-1.3 1.3A10.7 10.7 0 012.2 3.8 1.3 1.3 0 013.5 2.5z" /></svg>
                    {order.phone}
                  </a>
                )}
              </div>
            </Card>

            {/* Paiement */}
            <Card title="Paiement">
              <div className="space-y-2 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-ink-2">Sous-total</span>
                  <span className="font-mono text-ink-1">{formatPrice(order.subtotal)}</span>
                </div>
                {(order.discount_amount ?? 0) > 0 && (
                  <div className="flex items-baseline justify-between">
                    <span className="text-emerald-400">Réduction newsletter</span>
                    <span className="font-mono font-semibold text-emerald-400">−{formatPrice(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="text-ink-2">Livraison</span>
                  {order.shipping === 0 ? (
                    <span className="font-mono font-semibold text-emerald-400">{isPickup ? 'Retrait' : 'Offerte'}</span>
                  ) : (
                    <span className="font-mono text-ink-1">{formatPrice(order.shipping)}</span>
                  )}
                </div>
                <div className="my-1 border-t border-dashed" style={{ borderColor: 'var(--line-amber)' }} />
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-amber">Total payé</span>
                  <span className="font-mono text-base font-bold text-amber">{formatPrice(order.total_amount)}</span>
                </div>

                {/* Coût réel de l'étiquette : l'API Boxtal ne le donne qu'après
                    création, on l'enregistre pour voir la marge réelle sur le port. */}
                {order.shipping_cost !== null && order.shipping_cost !== undefined && (
                  <div className="mt-2 border-t border-[var(--line)] pt-2">
                    <div className="flex items-baseline justify-between text-[12px]">
                      <span className="text-ink-3">Coût étiquette Boxtal (HT)</span>
                      <span className="font-mono text-ink-2">{formatPrice(order.shipping_cost)}</span>
                    </div>
                    <div className="mt-0.5 flex items-baseline justify-between text-[12px]">
                      <span className="text-ink-3">Marge sur le port</span>
                      <span className={['font-mono font-semibold', order.shipping - order.shipping_cost >= 0 ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
                        {order.shipping - order.shipping_cost >= 0 ? '+' : ''}{formatPrice(order.shipping - order.shipping_cost)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Notes internes */}
            <Card title="Notes internes" right={notesDirty ? <UnsavedDot /> : undefined}>
              <textarea value={notesInput} onChange={(e) => setNotesInput(e.target.value)} rows={4} placeholder="Remarques, todo…"
                className={[
                  'w-full resize-none rounded-lg border bg-bg-2 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none',
                  notesDirty ? 'border-amber/50' : 'border-[var(--line-2)] focus:border-amber/50',
                ].join(' ')} />
              <button onClick={() => updateField({ admin_notes: notesInput }, 'Notes sauvegardées')} disabled={saving || !notesDirty}
                className="mt-2 cursor-pointer rounded-lg border border-[var(--line-2)] bg-bg-3 px-4 py-2 text-sm text-ink-1 transition-colors hover:border-[var(--line-amber)] hover:text-ink-0 disabled:cursor-default disabled:opacity-40">
                {saving ? 'Sauvegarde…' : 'Sauvegarder les notes'}
              </button>
            </Card>

            {/* Lien suivi client */}
            <Card title="Lien de suivi client">
              <p className="break-all font-mono text-xs leading-relaxed text-ink-2">{suiviUrl}</p>
              <button onClick={copyLink} className="mt-2.5 flex cursor-pointer items-center gap-1.5 text-xs font-medium text-amber transition-colors hover:text-amber-soft">
                {copied ? (
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
            {/* Annulation */}
            {!['shipped', 'delivered', 'cancelled'].includes(order.status) && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-400/70">Zone danger</p>

                {cancelResult && (
                  <div className="space-y-1 text-xs">
                    <p className={cancelResult.stripeRefunded ? 'text-emerald-400' : 'text-ink-3'}>
                      {cancelResult.stripeRefunded ? '✓ Remboursement Stripe effectué' : '— Pas de paiement à rembourser'}
                    </p>
                    {order.boxtal_order_id && (
                      <p className={cancelResult.boxtalCancelled ? 'text-emerald-400' : 'text-amber'}>
                        {cancelResult.boxtalCancelled
                          ? '✓ Expédition Boxtal annulée'
                          : `⚠ Boxtal : ${cancelResult.boxtalError ?? 'annulation impossible (déjà pris en charge ?)'}`}
                      </p>
                    )}
                  </div>
                )}

                {cancelError && <p className="text-xs text-red-400">{cancelError}</p>}

                <button
                  onClick={cancelOrder}
                  disabled={cancelling || deleting}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cancelling ? (
                    <>
                      <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" /></svg>
                      Annulation…
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
                      Annuler la commande
                    </>
                  )}
                </button>

                <div className="border-t border-red-500/15 pt-3">
                  {deleteError && <p className="mb-2 text-xs text-red-400">{deleteError}</p>}
                  <button
                    onClick={deleteOrder}
                    disabled={cancelling || deleting}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-500/20 px-4 py-2.5 text-sm font-medium text-red-500/60 transition-colors hover:border-red-500/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting ? (
                      <>
                        <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" /></svg>
                        Suppression…
                      </>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3.5h10M5.5 3.5V2.5h3V3.5M3.5 3.5l.7 8h6.6l.7-8" /></svg>
                        Supprimer définitivement
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {modal}
    </main>
  )
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-1">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{title}</h2>
        {right}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}
