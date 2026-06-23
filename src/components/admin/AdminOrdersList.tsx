'use client'

import { useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ORDER_STATUS_LABELS, formatDestination, type Order, type OrderStatus } from '@/types/order'
import { CUSTOM_STATUS_LABELS, type CustomOrder, type CustomOrderStatus } from '@/types/custom-order'
import { SHOP_STATUS_LABELS, type ShopOrder, type ShopOrderStatus } from '@/types/shop-order'
import { formatPrice } from '@/lib/utils'
import {
  STATUS_PILL, STATUS_ACCENT, STATUS_SHORT_LABELS, ALL_STATUSES,
  CUSTOM_STATUS_PILL, CUSTOM_STATUS_ACCENT, CUSTOM_STATUS_SHORT_LABELS,
  SHOP_STATUS_PILL, SHOP_STATUS_ACCENT, SHOP_STATUS_SHORT_LABELS, ALL_SHOP_STATUSES,
} from '@/lib/status-ui'
import { DestinationIcon } from '@/components/nfc/NfcLinkPicker'
import Select from '@/components/ui/Select'

// ── Types ─────────────────────────────────────────────────────────────────────

type Section         = 'nfc' | 'custom' | 'boutique'
type Period          = 'week' | 'month' | 'year' | 'all'
type SortKey         = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'amount_desc'
type NfcFilterKey    = 'all' | 'active' | 'no_label' | OrderStatus
type CustomFilterKey = 'all' | 'active' | CustomOrderStatus
type ShopFilterKey   = 'all' | 'active' | ShopOrderStatus

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date_desc',   label: 'Plus récente' },
  { key: 'date_asc',    label: 'Plus ancienne' },
  { key: 'name_asc',    label: 'Nom A→Z' },
  { key: 'name_desc',   label: 'Nom Z→A' },
  { key: 'amount_desc', label: 'Montant ↓' },
]

// ── Filtres NFC ───────────────────────────────────────────────────────────────

const NFC_FILTERS: { key: NfcFilterKey; label: string; dot?: string; match: (o: Order) => boolean }[] = [
  { key: 'active',   label: 'À traiter',      match: (o) => o.status !== 'delivered' && o.status !== 'cancelled' },
  { key: 'all',      label: 'Toutes',         match: () => true },
  ...ALL_STATUSES.map((s) => ({
    key: s as NfcFilterKey,
    label: STATUS_SHORT_LABELS[s],
    dot: STATUS_ACCENT[s],
    match: (o: Order) => o.status === s,
  })),
  { key: 'no_label', label: 'Sans étiquette', dot: '#F59E0B', match: (o: Order) => o.status === 'processing' && !o.boxtal_order_id },
]

// ── Filtres Custom ────────────────────────────────────────────────────────────

const CUSTOM_STATUSES: CustomOrderStatus[] = [
  'pending_quote', 'quote_sent', 'deposit_paid', 'in_production', 'shipped', 'delivered', 'cancelled',
]

const CUSTOM_FILTERS: { key: CustomFilterKey; label: string; dot?: string; match: (o: CustomOrder) => boolean }[] = [
  { key: 'active', label: 'À traiter', match: (o) => o.status !== 'delivered' && o.status !== 'cancelled' },
  { key: 'all',    label: 'Toutes',    match: () => true },
  ...CUSTOM_STATUSES.map((s) => ({
    key: s as CustomFilterKey,
    label: CUSTOM_STATUS_SHORT_LABELS[s],
    dot: CUSTOM_STATUS_ACCENT[s],
    match: (o: CustomOrder) => o.status === s,
  })),
]

// ── Filtres Shop ──────────────────────────────────────────────────────────────

const SHOP_FILTERS: { key: ShopFilterKey; label: string; dot?: string; match: (o: ShopOrder) => boolean }[] = [
  { key: 'active', label: 'À traiter', match: (o) => o.status !== 'delivered' && o.status !== 'cancelled' },
  { key: 'all',    label: 'Toutes',    match: () => true },
  ...ALL_SHOP_STATUSES.map((s) => ({
    key: s as ShopFilterKey,
    label: SHOP_STATUS_SHORT_LABELS[s],
    dot: SHOP_STATUS_ACCENT[s],
    match: (o: ShopOrder) => o.status === s,
  })),
]

// ── Périodes ──────────────────────────────────────────────────────────────────

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
  { key: 'all', label: 'Tout' },
]

function sortList<T>(arr: T[], sort: SortKey, getName: (o: T) => string, getDate: (o: T) => string, getAmount: (o: T) => number): T[] {
  return [...arr].sort((a, b) => {
    switch (sort) {
      case 'date_desc':   return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime()
      case 'date_asc':    return new Date(getDate(a)).getTime() - new Date(getDate(b)).getTime()
      case 'name_asc':    return getName(a).localeCompare(getName(b), 'fr', { sensitivity: 'base' })
      case 'name_desc':   return getName(b).localeCompare(getName(a), 'fr', { sensitivity: 'base' })
      case 'amount_desc': return getAmount(b) - getAmount(a)
    }
  })
}

function periodStart(p: Period): Date | null {
  const now = new Date()
  switch (p) {
    case 'week': {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      d.setDate(d.getDate() - (d.getDay() + 6) % 7)
      return d
    }
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'year':  return new Date(now.getFullYear(), 0, 1)
    case 'all':   return null
  }
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function AdminOrdersList({
  orders,
  customOrders,
  shopOrders,
  initialSection,
}: {
  orders: Order[]
  customOrders: CustomOrder[]
  shopOrders: ShopOrder[]
  initialSection?: Section
}) {
  const router = useRouter()
  const [section, setSection]             = useState<Section>(initialSection ?? 'nfc')
  const [period, setPeriod]               = useState<Period>('all')
  const [nfcFilter, setNfcFilter]         = useState<NfcFilterKey>('active')
  const [customFilter, setCustomFilter]   = useState<CustomFilterKey>('active')
  const [shopFilter, setShopFilter]       = useState<ShopFilterKey>('active')
  const [nfcQuery, setNfcQuery]           = useState('')
  const [customQuery, setCustomQuery]     = useState('')
  const [shopQuery, setShopQuery]         = useState('')
  const [selectedNfc, setSelectedNfc]     = useState<Set<string>>(new Set())
  const [selectedCustom, setSelectedCustom] = useState<Set<string>>(new Set())
  const [selectedShop, setSelectedShop]   = useState<Set<string>>(new Set())
  const [nfcSort, setNfcSort]             = useState<SortKey>('date_desc')
  const [customSort, setCustomSort]       = useState<SortKey>('date_desc')
  const [shopSort, setShopSort]           = useState<SortKey>('date_desc')
  const [deleting, setDeleting]           = useState(false)

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin')
    router.refresh()
  }

  // ── Filtrage par période ──
  const periodNfc = useMemo(() => {
    const start = periodStart(period)
    return start ? orders.filter((o) => new Date(o.created_at) >= start) : orders
  }, [orders, period])

  const periodCustom = useMemo(() => {
    const start = periodStart(period)
    return start ? customOrders.filter((o) => new Date(o.created_at) >= start) : customOrders
  }, [customOrders, period])

  const periodShop = useMemo(() => {
    const start = periodStart(period)
    return start ? shopOrders.filter((o) => new Date(o.created_at) >= start) : shopOrders
  }, [shopOrders, period])

  // ── Stats ──
  const stats = useMemo(() => {
    const nfcPaid    = periodNfc.filter((o) => o.status !== 'pending_payment')
    const customPaid = periodCustom.filter((o) => ['deposit_paid', 'in_production', 'shipped', 'delivered'].includes(o.status))
    const shopPaid   = periodShop.filter((o) => o.status !== 'pending_payment' && o.status !== 'cancelled')
    return {
      // NFC
      nfcRevenue:    nfcPaid.reduce((s, o) => s + o.total_amount, 0),
      nfcTotal:      periodNfc.length,
      nfcProduction: periodNfc.filter((o) => ['confirmed', 'processing'].includes(o.status)).length,
      nfcNoLabel:    periodNfc.filter((o) => o.status === 'processing' && !o.boxtal_order_id).length,
      // Custom
      customRevenue:    customPaid.reduce((s, o) => s + (o.deposit_amount ?? 0), 0),
      customTotal:      periodCustom.length,
      customPending:    periodCustom.filter((o) => o.status === 'pending_quote').length,
      customProduction: periodCustom.filter((o) => ['deposit_paid', 'in_production'].includes(o.status)).length,
      // Boutique
      shopRevenue:    shopPaid.reduce((s, o) => s + o.total_amount, 0),
      shopTotal:      periodShop.length,
      shopProduction: periodShop.filter((o) => ['confirmed', 'processing'].includes(o.status)).length,
      shopActive:     periodShop.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length,
      // Combiné
      totalAll:   periodNfc.length + periodCustom.length + periodShop.length,
      revenueAll: nfcPaid.reduce((s, o) => s + o.total_amount, 0)
                + customPaid.reduce((s, o) => s + (o.deposit_amount ?? 0), 0)
                + shopPaid.reduce((s, o) => s + o.total_amount, 0),
    }
  }, [periodNfc, periodCustom, periodShop])

  // ── Compteurs filtres ──
  const nfcCounts = useMemo(() => {
    const c = Object.fromEntries(NFC_FILTERS.map((f) => [f.key, 0])) as Record<NfcFilterKey, number>
    for (const o of periodNfc) for (const f of NFC_FILTERS) if (f.match(o)) c[f.key]++
    return c
  }, [periodNfc])

  const customCounts = useMemo(() => {
    const c = Object.fromEntries(CUSTOM_FILTERS.map((f) => [f.key, 0])) as Record<CustomFilterKey, number>
    for (const o of periodCustom) for (const f of CUSTOM_FILTERS) if (f.match(o)) c[f.key]++
    return c
  }, [periodCustom])

  const shopCounts = useMemo(() => {
    const c = Object.fromEntries(SHOP_FILTERS.map((f) => [f.key, 0])) as Record<ShopFilterKey, number>
    for (const o of periodShop) for (const f of SHOP_FILTERS) if (f.match(o)) c[f.key]++
    return c
  }, [periodShop])

  // ── Listes filtrées + triées ──
  const filteredNfc = useMemo(() => {
    const active = NFC_FILTERS.find((f) => f.key === nfcFilter)!
    const q = nfcQuery.trim().toLowerCase()
    const list = periodNfc.filter((o) => {
      if (!active.match(o)) return false
      if (!q) return true
      return o.company.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
    })
    return sortList(list, nfcSort, (o) => o.company, (o) => o.created_at, (o) => o.total_amount)
  }, [periodNfc, nfcFilter, nfcQuery, nfcSort])

  const filteredCustom = useMemo(() => {
    const active = CUSTOM_FILTERS.find((f) => f.key === customFilter)!
    const q = customQuery.trim().toLowerCase()
    const list = periodCustom.filter((o) => {
      if (!active.match(o)) return false
      if (!q) return true
      return o.name.toLowerCase().includes(q) || (o.company ?? '').toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
    })
    return sortList(list, customSort, (o) => o.company ?? o.name, (o) => o.created_at, (o) => o.deposit_amount ?? 0)
  }, [periodCustom, customFilter, customQuery, customSort])

  const filteredShop = useMemo(() => {
    const active = SHOP_FILTERS.find((f) => f.key === shopFilter)!
    const q = shopQuery.trim().toLowerCase()
    const list = periodShop.filter((o) => {
      if (!active.match(o)) return false
      if (!q) return true
      return o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
    })
    return sortList(list, shopSort, (o) => o.name, (o) => o.created_at, (o) => o.total_amount)
  }, [periodShop, shopFilter, shopQuery, shopSort])

  // ── Sélection NFC ──
  const toggleNfc = useCallback((id: string) => {
    setSelectedNfc((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])
  const toggleAllNfc = useCallback(() => {
    setSelectedNfc((prev) => prev.size === filteredNfc.length ? new Set() : new Set(filteredNfc.map((o) => o.id)))
  }, [filteredNfc])

  // ── Sélection Custom ──
  const toggleCustom = useCallback((id: string) => {
    setSelectedCustom((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])
  const toggleAllCustom = useCallback(() => {
    setSelectedCustom((prev) => prev.size === filteredCustom.length ? new Set() : new Set(filteredCustom.map((o) => o.id)))
  }, [filteredCustom])

  // ── Sélection Shop ──
  const toggleShop = useCallback((id: string) => {
    setSelectedShop((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])
  const toggleAllShop = useCallback(() => {
    setSelectedShop((prev) => prev.size === filteredShop.length ? new Set() : new Set(filteredShop.map((o) => o.id)))
  }, [filteredShop])

  // ── Suppression ──
  async function deleteNfc(ids: string[]) {
    if (!confirm(`Supprimer ${ids.length} commande${ids.length > 1 ? 's' : ''} NFC ? Cette action est irréversible.`)) return
    setDeleting(true)
    await Promise.all(ids.map((id) => fetch(`/api/admin/orders/${id}`, { method: 'DELETE' })))
    setSelectedNfc(new Set())
    setDeleting(false)
    router.refresh()
  }

  async function deleteCustom(ids: string[]) {
    if (!confirm(`Supprimer ${ids.length} demande${ids.length > 1 ? 's' : ''} sur-mesure ? Cette action est irréversible.`)) return
    setDeleting(true)
    await Promise.all(ids.map((id) => fetch(`/api/admin/custom/${id}`, { method: 'DELETE' })))
    setSelectedCustom(new Set())
    setDeleting(false)
    router.refresh()
  }

  async function deleteShop(ids: string[]) {
    if (!confirm(`Supprimer ${ids.length} commande${ids.length > 1 ? 's' : ''} boutique ? Cette action est irréversible.`)) return
    setDeleting(true)
    await Promise.all(ids.map((id) => fetch(`/api/admin/boutique/orders/${id}`, { method: 'DELETE' })))
    setSelectedShop(new Set())
    setDeleting(false)
    router.refresh()
  }

  const currentYear = new Date().getFullYear()

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-10">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">3BeeStudio · Admin</p>
            <h1 className="mt-1.5 text-2xl font-extrabold text-ink-0" style={{ letterSpacing: '-0.02em' }}>
              {initialSection === 'nfc' ? 'Porte-clé NFC' : initialSection === 'custom' ? 'Sur-mesure' : 'Commandes'}
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex cursor-pointer items-center gap-1.5 rounded-pill border border-[var(--line-2)] px-4 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-ink-1"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 14H3.5A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2H6M11 11l3-3-3-3M14 8H6" />
            </svg>
            Déconnexion
          </button>
        </div>

        {/* Période */}
        <div className="flex items-center justify-between gap-3">
          <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-ink-3 sm:block">Vue d&apos;ensemble</span>
          <div className="grid w-full grid-cols-4 gap-1 rounded-pill p-1 sm:w-auto" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={['cursor-pointer rounded-pill px-4 py-1.5 text-xs font-medium transition-all', period === p.key ? 'bg-amber font-semibold text-bg-0' : 'text-ink-2 hover:text-ink-0'].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* CA Global — visible uniquement sur la page Commandes, toujours affiché */}
        {!initialSection && (
          <div className="flex items-center gap-4 rounded-xl border border-[var(--line-amber)] px-5 py-4" style={{ background: 'rgba(245,158,11,0.05)' }}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 4.5a4.5 4.5 0 100 7M2.5 6.8h6M2.5 9.2h6" /></svg>
            </span>
            <div>
              <p className="font-mono text-2xl font-bold text-amber leading-tight">{formatPrice(stats.revenueAll)}</p>
              <p className="text-[11px] text-ink-3">CA Global · {stats.totalAll} commandes toutes sources</p>
            </div>
            <div className="ml-auto hidden sm:flex items-center divide-x divide-[var(--line)]">
              {[
                { label: 'NFC', value: formatPrice(stats.nfcRevenue), color: '#a3e635' },
                { label: 'Sur-mesure', value: formatPrice(stats.customRevenue), color: '#c084fc' },
                { label: 'Boutique', value: formatPrice(stats.shopRevenue), color: '#38bdf8' },
              ].map((x) => (
                <div key={x.label} className="px-4 text-right">
                  <p className="font-mono text-sm font-bold" style={{ color: x.color }}>{x.value}</p>
                  <p className="text-[10px] text-ink-3">{x.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats contextuelles — selon l'onglet actif ou la page dédiée */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(section === 'nfc' ? [
            { label: 'CA NFC encaissé',    value: formatPrice(stats.nfcRevenue),   accent: '#F59E0B', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 4.5a4.5 4.5 0 100 7M2.5 6.8h6M2.5 9.2h6" /></svg> },
            { label: 'Commandes NFC',      value: String(stats.nfcTotal),          accent: 'var(--ink-1)', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="12" height="9" rx="1.5" /><path d="M5.5 4V3a2.5 2.5 0 015 0v1" /></svg> },
            { label: 'En production',      value: String(stats.nfcProduction),     accent: '#fb923c', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2.5h8V6M4 11H2.5V6h11v5H12M4 9.5h8V14H4V9.5z" /></svg> },
            { label: 'Étiquettes à faire', value: String(stats.nfcNoLabel),        accent: '#a3e635', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8.6 1.5H14v5.4l-7 7-5.4-5.4 7-7z" /><circle cx="11" cy="4.6" r="1" fill="currentColor" stroke="none" /></svg> },
          ] : section === 'custom' ? [
            { label: 'CA acomptes reçus',  value: formatPrice(stats.customRevenue), accent: '#F59E0B', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 4.5a4.5 4.5 0 100 7M2.5 6.8h6M2.5 9.2h6" /></svg> },
            { label: 'Demandes totales',   value: String(stats.customTotal),        accent: 'var(--ink-1)', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 2.5l3 3-8 8H2.5v-3l8-8z" /></svg> },
            { label: 'Devis à envoyer',    value: String(stats.customPending),      accent: '#fbbf24', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H3a1 1 0 00-1 1v10l3-2h8a1 1 0 001-1V3a1 1 0 00-1-1z" /></svg> },
            { label: 'En production',      value: String(stats.customProduction),   accent: '#fb923c', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2.5h8V6M4 11H2.5V6h11v5H12M4 9.5h8V14H4V9.5z" /></svg> },
          ] : [
            { label: 'CA boutique',    value: formatPrice(stats.shopRevenue),  accent: '#38bdf8', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 4.5a4.5 4.5 0 100 7M2.5 6.8h6M2.5 9.2h6" /></svg> },
            { label: 'Commandes',      value: String(stats.shopTotal),         accent: 'var(--ink-1)', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12l-1 8H3L2 4z" /><path d="M5 4l1-2h4l1 2" /></svg> },
            { label: 'À traiter',      value: String(stats.shopActive),        accent: '#fbbf24', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 2" /></svg> },
            { label: 'En traitement',  value: String(stats.shopProduction),    accent: '#fb923c', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6V2.5h8V6M4 11H2.5V6h11v5H12M4 9.5h8V14H4V9.5z" /></svg> },
          ]).map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-bg-1 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${s.accent} 12%, transparent)`, color: s.accent }}>
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate font-mono text-lg font-bold leading-tight" style={{ color: s.accent }}>{s.value}</p>
                <p className="truncate text-[11px] text-ink-3">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs — masqués sur les pages dédiées (initialSection fourni) */}
        {!initialSection && (
          <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            {([
              { key: 'nfc' as Section, label: 'Porte-clé NFC', count: periodNfc.length, icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="12" height="9" rx="1.5" /><path d="M5.5 4V3a2.5 2.5 0 015 0v1" /><path d="M8 8v2M8 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" /></svg> },
              { key: 'custom' as Section, label: 'Sur-mesure', count: periodCustom.length, icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 2.5l3 3-8 8H2.5v-3l8-8z" /><path d="M8.5 4.5l3 3" /></svg> },
              { key: 'boutique' as Section, label: 'Boutique', count: periodShop.length, icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12l-1 8H3L2 4z" /><path d="M5 4l1-2h4l1 2" /></svg> },
            ] as const).map(({ key, label, count, icon }) => (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={['flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all', section === key ? 'bg-bg-0 text-ink-0 shadow-sm' : 'text-ink-3 hover:text-ink-1'].join(' ')}
              >
                <span style={{ color: section === key ? 'var(--amber)' : 'currentColor' }}>{icon}</span>
                {label}
                <span className={['rounded-pill px-2 py-0.5 font-mono text-[11px]', section === key ? 'bg-amber/10 text-amber' : 'bg-bg-3 text-ink-3'].join(' ')}>{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── Section NFC ── */}
        {section === 'nfc' && (
          <>
            <FilterBar
              filters={NFC_FILTERS}
              active={nfcFilter}
              counts={nfcCounts}
              onFilter={setNfcFilter}
              query={nfcQuery}
              onQuery={setNfcQuery}
              sort={nfcSort}
              onSort={setNfcSort}
              selected={selectedNfc}
              total={filteredNfc.length}
              onToggleAll={toggleAllNfc}
              onDelete={() => deleteNfc([...selectedNfc])}
              deleting={deleting}
            />
            <NfcList
              orders={filteredNfc}
              allEmpty={orders.length === 0}
              currentYear={currentYear}
              selected={selectedNfc}
              onToggle={toggleNfc}
              onDelete={(id) => deleteNfc([id])}
              deleting={deleting}
            />
          </>
        )}

        {/* ── Section Custom ── */}
        {section === 'custom' && (
          <>
            <FilterBar
              filters={CUSTOM_FILTERS}
              active={customFilter}
              counts={customCounts}
              onFilter={setCustomFilter}
              query={customQuery}
              onQuery={setCustomQuery}
              sort={customSort}
              onSort={setCustomSort}
              selected={selectedCustom}
              total={filteredCustom.length}
              onToggleAll={toggleAllCustom}
              onDelete={() => deleteCustom([...selectedCustom])}
              deleting={deleting}
              searchPlaceholder="Nom, email, référence…"
            />
            <CustomList
              orders={filteredCustom}
              allEmpty={customOrders.length === 0}
              currentYear={currentYear}
              selected={selectedCustom}
              onToggle={toggleCustom}
              onDelete={(id) => deleteCustom([id])}
              deleting={deleting}
            />
          </>
        )}

        {/* ── Section Boutique ── */}
        {section === 'boutique' && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-ink-3">{periodShop.length} commande{periodShop.length !== 1 ? 's' : ''} sur la période</span>
              <Link
                href="/admin/boutique"
                className="flex items-center gap-1.5 rounded-pill border border-[var(--line-2)] px-3 py-1.5 text-[11px] font-medium text-ink-2 hover:border-[var(--line-amber)] hover:text-amber transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 4h12l-1 8H3L2 4z" /><path d="M5 4l1-2h4l1 2" /></svg>
                Gérer les produits →
              </Link>
            </div>
            <FilterBar
              filters={SHOP_FILTERS}
              active={shopFilter}
              counts={shopCounts}
              onFilter={setShopFilter}
              query={shopQuery}
              onQuery={setShopQuery}
              sort={shopSort}
              onSort={setShopSort}
              selected={selectedShop}
              total={filteredShop.length}
              onToggleAll={toggleAllShop}
              onDelete={() => deleteShop([...selectedShop])}
              deleting={deleting}
              searchPlaceholder="Nom, email, référence…"
            />
            <ShopList
              orders={filteredShop}
              allEmpty={shopOrders.length === 0}
              currentYear={currentYear}
              selected={selectedShop}
              onToggle={toggleShop}
              onDelete={(id) => deleteShop([id])}
              deleting={deleting}
            />
          </>
        )}
      </div>
    </main>
  )
}

// ── Barre filtres + bulk action ───────────────────────────────────────────────

function FilterBar<K extends string>({
  filters, active, counts, onFilter,
  query, onQuery,
  sort, onSort,
  selected, total, onToggleAll, onDelete, deleting,
  searchPlaceholder = 'Entreprise, email, référence…',
}: {
  filters: { key: K; label: string; dot?: string; match: (o: never) => boolean }[]
  active: K
  counts: Record<K, number>
  onFilter: (k: K) => void
  query: string
  onQuery: (v: string) => void
  sort: SortKey
  onSort: (s: SortKey) => void
  selected: Set<string>
  total: number
  onToggleAll: () => void
  onDelete: () => void
  deleting: boolean
  searchPlaceholder?: string
}) {
  const hasSelection = selected.size > 0
  const allSelected  = selected.size === total && total > 0

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilter(f.key)}
            className={['flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-pill px-3 py-1.5 text-xs font-medium transition-colors', active === f.key ? 'bg-amber text-bg-0' : 'border border-[var(--line-2)] bg-bg-1 text-ink-2 hover:border-[var(--line-amber)] hover:text-ink-1'].join(' ')}
          >
            {f.dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: active === f.key ? 'rgba(10,10,11,0.55)' : f.dot }} />}
            {f.label}
            <span className={['font-mono', active === f.key ? 'text-bg-0/60' : 'text-ink-3'].join(' ')}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {/* Checkbox sélectionner tout */}
        <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-ink-3 hover:text-ink-1">
          <span
            className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded"
            style={{
              background: allSelected ? 'var(--amber)' : 'var(--bg-3)',
              border: allSelected ? '1px solid var(--amber)' : '1px solid var(--line-2)',
            }}
          >
            {allSelected && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#1A1300" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 4l2 2 4-3.5" />
              </svg>
            )}
            <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="sr-only" />
          </span>
          {hasSelection ? <span className="text-amber font-medium">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span> : 'Tout sélectionner'}
        </label>

        {/* Bouton delete bulk */}
        {hasSelection && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="flex cursor-pointer items-center gap-1.5 rounded-pill border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5h10M5 5V3.5h6V5M6 8v5M10 8v5M4 5l1 8h6l1-8" />
            </svg>
            {deleting ? '…' : `Supprimer (${selected.size})`}
          </button>
        )}

        {/* Tri */}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-ink-3">Trier</span>
          <div className="w-36">
            <Select
              compact
              value={sort}
              onChange={(v) => onSort(v as SortKey)}
              options={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
            />
          </div>
        </div>

        {/* Recherche */}
        <div className="relative sm:w-56">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-pill border border-[var(--line-2)] bg-bg-1 py-1.5 pl-8 pr-3 text-[11px] text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}

// ── Liste NFC ─────────────────────────────────────────────────────────────────

function NfcList({
  orders, allEmpty, currentYear, selected, onToggle, onDelete, deleting,
}: {
  orders: Order[]; allEmpty: boolean; currentYear: number
  selected: Set<string>; onToggle: (id: string) => void; onDelete: (id: string) => void; deleting: boolean
}) {
  if (orders.length === 0) {
    return <EmptyState icon={<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="12" height="9" rx="1.5" /><path d="M5.5 4V3a2.5 2.5 0 015 0v1" /></svg>} label={allEmpty ? 'Aucune commande NFC' : 'Aucune commande ne correspond'} hint={!allEmpty} />
  }
  return (
    <div className="space-y-2">
      {orders.map((order) => {
        const status = order.status as OrderStatus
        const needsLabel = order.status === 'processing' && !order.boxtal_order_id
        const created = new Date(order.created_at)
        const isSelected = selected.has(order.id)
        return (
          <div key={order.id} className={['group flex items-stretch overflow-hidden rounded-xl border bg-bg-1 transition-all', isSelected ? 'border-amber/40 bg-bg-2' : 'border-[var(--line)] hover:border-amber/30 hover:bg-bg-2'].join(' ')}>
            {/* Accent statut */}
            <span className="w-[3px] shrink-0" style={{ background: STATUS_ACCENT[status] }} />

            {/* Checkbox */}
            <label className="flex cursor-pointer items-center px-2.5" onClick={(e) => e.stopPropagation()}>
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded" style={{ background: isSelected ? 'var(--amber)' : 'var(--bg-3)', border: isSelected ? '1px solid var(--amber)' : '1px solid var(--line-2)' }}>
                {isSelected && <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#1A1300" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4l2 2 4-3.5" /></svg>}
                <input type="checkbox" checked={isSelected} onChange={() => onToggle(order.id)} className="sr-only" />
              </span>
            </label>

            {/* Contenu cliquable */}
            <Link href={`/admin/commandes/${order.id}`} className="flex flex-1 items-center gap-4 py-3.5 pr-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg sm:flex" style={{ background: 'var(--hi-04)', border: '1px solid var(--line)' }}>
                {order.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={order.logo_url} alt="" className="h-8 w-8 object-contain" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--ink-3)" strokeWidth="1.3"><rect x="2" y="2" width="12" height="12" rx="2" /><circle cx="6" cy="6" r="1.3" /><path d="M2 11l3.5-3.5L9 11l2.5-2.5L14 11" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink-0 group-hover:text-amber">{order.company}</p>
                  <span className="shrink-0 font-mono text-[10px] text-ink-3">#{order.id.slice(0, 8).toUpperCase()}</span>
                  {needsLabel && <span className="shrink-0 rounded-pill border border-amber/40 bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber">Étiquette à générer</span>}
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-3">
                  <span className="font-mono text-ink-2">{order.quantity} u.</span> · {order.email}
                </p>
                <span className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-pill px-2 py-0.5" style={{ background: 'var(--hi-04)', border: '1px solid var(--line)' }}>
                  <span className="flex shrink-0 text-ink-3"><DestinationIcon value={order.nfc_url} size={10} /></span>
                  <span className="truncate font-mono text-[10px] text-ink-2">{formatDestination(order.nfc_url)}</span>
                </span>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={['rounded-pill px-2.5 py-0.5 text-[11px] font-semibold', STATUS_PILL[status]].join(' ')}>{ORDER_STATUS_LABELS[status]}</span>
                <span className="font-mono text-sm font-semibold text-ink-0">{formatPrice(order.total_amount)}</span>
                <span className="text-[10px] text-ink-3">{created.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', ...(created.getFullYear() !== currentYear ? { year: 'numeric' } : {}) })}</span>
              </div>
            </Link>

            {/* Bouton suppression individuelle */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(order.id) }}
              disabled={deleting}
              aria-label="Supprimer"
              className="flex cursor-pointer items-center px-3 text-ink-3 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400 disabled:opacity-30"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h10M5 5V3.5h6V5M6 8v5M10 8v5M4 5l1 8h6l1-8" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Liste Custom ──────────────────────────────────────────────────────────────

const PROJECT_TYPE_LABELS: Record<string, string> = {
  cadeau: 'Cadeau', deco: 'Déco', prototype: 'Prototype', mecanique: 'Mécanique', reparation: 'Réparation', autre: 'Autre',
}

function CustomList({
  orders, allEmpty, currentYear, selected, onToggle, onDelete, deleting,
}: {
  orders: CustomOrder[]; allEmpty: boolean; currentYear: number
  selected: Set<string>; onToggle: (id: string) => void; onDelete: (id: string) => void; deleting: boolean
}) {
  if (orders.length === 0) {
    return <EmptyState icon={<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 2.5l3 3-8 8H2.5v-3l8-8z" /></svg>} label={allEmpty ? 'Aucune demande sur-mesure' : 'Aucune demande ne correspond'} hint={!allEmpty} />
  }
  return (
    <div className="space-y-2">
      {orders.map((order) => {
        const status = order.status as CustomOrderStatus
        const created = new Date(order.created_at)
        const isSelected = selected.has(order.id)
        return (
          <div key={order.id} className={['group flex items-stretch overflow-hidden rounded-xl border bg-bg-1 transition-all', isSelected ? 'border-amber/40 bg-bg-2' : 'border-[var(--line)] hover:border-amber/30 hover:bg-bg-2'].join(' ')}>
            <span className="w-[3px] shrink-0" style={{ background: CUSTOM_STATUS_ACCENT[status] }} />

            <label className="flex cursor-pointer items-center px-3" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(order.id)}
                className="h-4 w-4 cursor-pointer accent-amber"
              />
            </label>

            <Link href={`/admin/custom/${order.id}`} className="flex flex-1 items-center gap-4 py-3.5 pr-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg sm:flex" style={{ background: 'var(--hi-04)', border: '1px solid var(--line)' }}>
                <span className="font-mono text-sm font-bold text-ink-2">{order.name.slice(0, 2).toUpperCase()}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink-0 group-hover:text-amber">{order.company ?? order.name}</p>
                  <span className="shrink-0 font-mono text-[10px] text-ink-3">#{order.id.slice(0, 8).toUpperCase()}</span>
                  {status === 'pending_quote' && <span className="shrink-0 rounded-pill border border-amber/40 bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber">Devis à envoyer</span>}
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-3">
                  {order.company ? <><span className="text-ink-2">{order.name}</span> · </> : null}{order.email}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="rounded-pill px-2 py-0.5 font-mono text-[10px]" style={{ background: 'var(--hi-04)', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>
                    {PROJECT_TYPE_LABELS[order.project_type] ?? order.project_type}
                  </span>
                  <span className="text-[10px] text-ink-3">{order.budget_range}</span>
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={['rounded-pill px-2.5 py-0.5 text-[11px] font-semibold', CUSTOM_STATUS_PILL[status]].join(' ')}>{CUSTOM_STATUS_LABELS[status]}</span>
                {order.deposit_amount
                  ? <span className="font-mono text-sm font-semibold text-ink-0">{formatPrice(order.deposit_amount)}</span>
                  : <span className="font-mono text-xs text-ink-3">— €</span>}
                <span className="text-[10px] text-ink-3">{created.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', ...(created.getFullYear() !== currentYear ? { year: 'numeric' } : {}) })}</span>
              </div>
            </Link>

            <button
              onClick={(e) => { e.stopPropagation(); onDelete(order.id) }}
              disabled={deleting}
              aria-label="Supprimer"
              className="flex cursor-pointer items-center px-3 text-ink-3 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400 disabled:opacity-30"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h10M5 5V3.5h6V5M6 8v5M10 8v5M4 5l1 8h6l1-8" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Liste Shop ────────────────────────────────────────────────────────────────

function ShopList({
  orders, allEmpty, currentYear, selected, onToggle, onDelete, deleting,
}: {
  orders: ShopOrder[]; allEmpty: boolean; currentYear: number
  selected: Set<string>; onToggle: (id: string) => void; onDelete: (id: string) => void; deleting: boolean
}) {
  if (orders.length === 0) {
    return <EmptyState icon={<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12l-1 8H3L2 4z" /><path d="M5 4l1-2h4l1 2" /></svg>} label={allEmpty ? 'Aucune commande boutique' : 'Aucune commande ne correspond'} hint={!allEmpty} />
  }
  return (
    <div className="space-y-2">
      {orders.map((order) => {
        const status = order.status as ShopOrderStatus
        const created = new Date(order.created_at)
        const isSelected = selected.has(order.id)
        const needsLabel = order.delivery_mode !== 'pickup'
          && (status === 'confirmed' || status === 'processing')
          && !order.boxtal_order_id
        return (
          <div key={order.id} className={['group flex items-stretch overflow-hidden rounded-xl border bg-bg-1 transition-all', isSelected ? 'border-amber/40 bg-bg-2' : 'border-[var(--line)] hover:border-amber/30 hover:bg-bg-2'].join(' ')}>
            <span className="w-[3px] shrink-0" style={{ background: SHOP_STATUS_ACCENT[status] }} />

            <label className="flex cursor-pointer items-center px-2.5" onClick={(e) => e.stopPropagation()}>
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded" style={{ background: isSelected ? 'var(--amber)' : 'var(--bg-3)', border: isSelected ? '1px solid var(--amber)' : '1px solid var(--line-2)' }}>
                {isSelected && <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="#1A1300" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4l2 2 4-3.5" /></svg>}
                <input type="checkbox" checked={isSelected} onChange={() => onToggle(order.id)} className="sr-only" />
              </span>
            </label>

            <Link href={`/admin/boutique/commande/${order.id}`} className="flex flex-1 items-center gap-4 py-3.5 pr-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg sm:flex" style={{ background: 'var(--hi-04)', border: '1px solid var(--line)' }}>
                <span className="font-mono text-sm font-bold text-ink-2">{order.name.slice(0, 2).toUpperCase()}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-ink-0 group-hover:text-amber">{order.name}</p>
                  <span className="shrink-0 font-mono text-[10px] text-ink-3">#{order.id.slice(0, 8).toUpperCase()}</span>
                  {needsLabel && <span className="shrink-0 rounded-pill border border-amber/40 bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber">Étiquette à générer</span>}
                  {order.delivery_mode === 'pickup' && <span className="shrink-0 rounded-pill border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-400">Retrait studio</span>}
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-3">{order.email}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {order.items.slice(0, 2).map((item, i) => (
                    <span key={i} className="rounded-pill px-2 py-0.5 font-mono text-[10px]" style={{ background: 'var(--hi-04)', border: '1px solid var(--line)', color: 'var(--ink-2)' }}>
                      {item.quantity}× {item.product_name}
                    </span>
                  ))}
                  {order.items.length > 2 && <span className="text-[10px] text-ink-3">+{order.items.length - 2}</span>}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={['rounded-pill px-2.5 py-0.5 text-[11px] font-semibold', SHOP_STATUS_PILL[status]].join(' ')}>{SHOP_STATUS_LABELS[status]}</span>
                <span className="font-mono text-sm font-semibold text-ink-0">{formatPrice(order.total_amount)}</span>
                <span className="text-[10px] text-ink-3">{created.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', ...(created.getFullYear() !== currentYear ? { year: 'numeric' } : {}) })}</span>
              </div>
            </Link>

            <button
              onClick={(e) => { e.stopPropagation(); onDelete(order.id) }}
              disabled={deleting}
              aria-label="Supprimer"
              className="flex cursor-pointer items-center px-3 text-ink-3 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400 disabled:opacity-30"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h10M5 5V3.5h6V5M6 8v5M10 8v5M4 5l1 8h6l1-8" />
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function EmptyState({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-[var(--line)] bg-bg-1 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-3 text-ink-3">{icon}</span>
      <p className="mt-4 text-sm font-medium text-ink-1">{label}</p>
      {hint && <p className="mt-1 text-xs text-ink-3">Essayez un autre filtre, une autre période ou une autre recherche.</p>}
    </div>
  )
}
