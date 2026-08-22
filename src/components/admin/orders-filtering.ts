'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Order, OrderStatus } from '@/types/order'
import type { CustomOrder, CustomOrderStatus } from '@/types/custom-order'
import type { ShopOrder, ShopOrderStatus } from '@/types/shop-order'
import {
  STATUS_ACCENT, STATUS_SHORT_LABELS, ALL_STATUSES,
  CUSTOM_STATUS_ACCENT, CUSTOM_STATUS_SHORT_LABELS,
  SHOP_STATUS_ACCENT, SHOP_STATUS_SHORT_LABELS, ALL_SHOP_STATUSES,
  isShopOrderActionable,
} from '@/lib/status-ui'

// Filtres, tri, périodes et hook de section du dashboard commandes admin.
// Extrait d'AdminOrdersList.tsx : les trois sections (NFC / sur-mesure / boutique)
// partagent exactement la même mécanique — un seul hook générique la porte.

// ── Types ─────────────────────────────────────────────────────────────────────

// 'boutique' = commandes avec un colis (physique pur ou mixte) · 'digital' =
// commandes 100 % fichiers, qui n'ont ni étiquette, ni adresse, ni suivi.
export type Section         = 'nfc' | 'custom' | 'boutique' | 'digital'
export type Period          = 'week' | 'month' | 'year' | 'all'
export type SortKey         = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'amount_desc'
export type NfcFilterKey    = 'all' | 'active' | 'no_label' | OrderStatus
export type CustomFilterKey = 'all' | 'active' | CustomOrderStatus
export type ShopFilterKey   = 'all' | 'active' | ShopOrderStatus
export type DigitalFilterKey = 'all' | 'active' | 'pending_payment' | 'confirmed' | 'cancelled'

export interface FilterDef<T, K extends string> {
  key: K
  label: string
  dot?: string
  match: (o: T) => boolean
}

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date_desc',   label: 'Plus récente' },
  { key: 'date_asc',    label: 'Plus ancienne' },
  { key: 'name_asc',    label: 'Nom A→Z' },
  { key: 'name_desc',   label: 'Nom Z→A' },
  { key: 'amount_desc', label: 'Montant ↓' },
]

export const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
  { key: 'all', label: 'Tout' },
]

// ── Filtres par section ───────────────────────────────────────────────────────

export const NFC_FILTERS: FilterDef<Order, NfcFilterKey>[] = [
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

const CUSTOM_STATUSES: CustomOrderStatus[] = [
  'pending_quote', 'quote_sent', 'deposit_paid', 'in_production', 'shipped', 'delivered', 'cancelled',
]

export const CUSTOM_FILTERS: FilterDef<CustomOrder, CustomFilterKey>[] = [
  { key: 'active', label: 'À traiter', match: (o) => o.status !== 'delivered' && o.status !== 'cancelled' },
  { key: 'all',    label: 'Toutes',    match: () => true },
  ...CUSTOM_STATUSES.map((s) => ({
    key: s as CustomFilterKey,
    label: CUSTOM_STATUS_SHORT_LABELS[s],
    dot: CUSTOM_STATUS_ACCENT[s],
    match: (o: CustomOrder) => o.status === s,
  })),
]

export const SHOP_FILTERS: FilterDef<ShopOrder, ShopFilterKey>[] = [
  { key: 'active', label: 'À traiter', match: (o) => isShopOrderActionable(o.status) },
  { key: 'all',    label: 'Toutes',    match: () => true },
  ...ALL_SHOP_STATUSES.map((s) => ({
    key: s as ShopFilterKey,
    label: SHOP_STATUS_SHORT_LABELS[s],
    dot: SHOP_STATUS_ACCENT[s],
    match: (o: ShopOrder) => o.status === s,
  })),
]

/**
 * Filtres des commandes de fichiers. On ne reprend pas SHOP_FILTERS : une commande
 * numérique ne passe jamais en préparation / expédiée / livrée, et afficher
 * « Expédiées 0 · Livrées 0 » serait du bruit permanent.
 */
export const DIGITAL_FILTERS: FilterDef<ShopOrder, DigitalFilterKey>[] = [
  { key: 'active',          label: 'À traiter',  match: (o) => o.status === 'pending_payment' },
  { key: 'all',             label: 'Toutes',     match: () => true },
  { key: 'pending_payment', label: SHOP_STATUS_SHORT_LABELS.pending_payment, dot: SHOP_STATUS_ACCENT.pending_payment, match: (o) => o.status === 'pending_payment' },
  { key: 'confirmed',       label: 'Livrées',    dot: SHOP_STATUS_ACCENT.confirmed,       match: (o) => o.status === 'confirmed' },
  { key: 'cancelled',       label: SHOP_STATUS_SHORT_LABELS.cancelled,       dot: SHOP_STATUS_ACCENT.cancelled,       match: (o) => o.status === 'cancelled' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

export function sortList<T>(arr: T[], sort: SortKey, getName: (o: T) => string, getDate: (o: T) => string, getAmount: (o: T) => number): T[] {
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

export function periodStart(p: Period): Date | null {
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

// ── Configs de section (stables au niveau module pour la mémoïsation) ─────────

export interface SectionConfig<T, K extends string> {
  filters: FilterDef<T, K>[]
  initialFilter: K
  getName: (o: T) => string
  getDate: (o: T) => string
  getAmount: (o: T) => number
  searchIn: (o: T) => (string | null | undefined)[]
}

export const NFC_SECTION: SectionConfig<Order, NfcFilterKey> = {
  filters: NFC_FILTERS,
  initialFilter: 'active',
  getName:   (o) => o.company,
  getDate:   (o) => o.created_at,
  getAmount: (o) => o.total_amount,
  searchIn:  (o) => [o.company, o.email, o.id],
}

export const CUSTOM_SECTION: SectionConfig<CustomOrder, CustomFilterKey> = {
  filters: CUSTOM_FILTERS,
  initialFilter: 'active',
  getName:   (o) => o.company || o.name, // `||` : company vaut '' pour un particulier
  getDate:   (o) => o.created_at,
  getAmount: (o) => o.deposit_amount ?? 0,
  searchIn:  (o) => [o.name, o.company, o.email, o.id],
}

export const SHOP_SECTION: SectionConfig<ShopOrder, ShopFilterKey> = {
  filters: SHOP_FILTERS,
  initialFilter: 'active',
  getName:   (o) => o.name,
  getDate:   (o) => o.created_at,
  getAmount: (o) => o.total_amount,
  searchIn:  (o) => [o.name, o.email, o.id],
}

/**
 * Même mécanique que SHOP_SECTION : seuls les filtres changent. Le tri par nom
 * reste utile (retrouver un acheteur), celui par montant beaucoup moins puisque
 * les fichiers sont à prix fixe — mais on garde le jeu complet par cohérence.
 */
export const DIGITAL_SECTION: SectionConfig<ShopOrder, DigitalFilterKey> = {
  filters: DIGITAL_FILTERS,
  initialFilter: 'all',
  getName:   (o) => o.name,
  getDate:   (o) => o.created_at,
  getAmount: (o) => o.total_amount,
  searchIn:  (o) => [o.name, o.email, o.id],
}

// ── Hook de section : filtre + recherche + tri + sélection ────────────────────

export function useOrderSection<T extends { id: string }, K extends string>(
  rows: T[],
  config: SectionConfig<T, K>,
) {
  const [filter, setFilter]     = useState<K>(config.initialFilter)
  const [query, setQuery]       = useState('')
  const [sort, setSort]         = useState<SortKey>('date_desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const counts = useMemo(() => {
    const c = Object.fromEntries(config.filters.map((f) => [f.key, 0])) as Record<K, number>
    for (const o of rows) for (const f of config.filters) if (f.match(o)) c[f.key]++
    return c
  }, [rows, config])

  const filtered = useMemo(() => {
    const active = config.filters.find((f) => f.key === filter)!
    const q = query.trim().toLowerCase()
    const list = rows.filter((o) => {
      if (!active.match(o)) return false
      if (!q) return true
      return config.searchIn(o).some((s) => (s ?? '').toLowerCase().includes(q))
    })
    return sortList(list, sort, config.getName, config.getDate, config.getAmount)
  }, [rows, config, filter, query, sort])

  const toggle = useCallback((id: string) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }, [])

  const toggleAll = useCallback(() => {
    setSelected((prev) => prev.size === filtered.length ? new Set() : new Set(filtered.map((o) => o.id)))
  }, [filtered])

  const clearSelection = useCallback(() => setSelected(new Set()), [])

  return { filter, setFilter, query, setQuery, sort, setSort, selected, toggle, toggleAll, clearSelection, filtered, counts }
}

// ── Fenêtrage d'affichage ─────────────────────────────────────────────────────

export const PAGE_SIZE = 25

/**
 * N'affiche qu'une fenêtre de la liste filtrée, avec un « charger plus ».
 *
 * Les cartes de commande sont riches (articles, adresse, pastilles de statut) :
 * au-delà de quelques dizaines de lignes, tout monter d'un coup rend le premier
 * paint et chaque changement de filtre nettement plus lents. La fenêtre repart à
 * zéro dès que la liste change (filtre, recherche, tri, période) — sinon on
 * garderait un « charger plus » déjà consommé sur une liste toute neuve.
 */
export function usePagedList<T>(items: T[], step = PAGE_SIZE) {
  const [visible, setVisible] = useState(step)
  const previous = useRef(items)

  useEffect(() => {
    if (previous.current !== items) {
      previous.current = items
      setVisible(step)
    }
  }, [items, step])

  return {
    shown: items.slice(0, visible),
    hasMore: items.length > visible,
    remaining: Math.max(0, items.length - visible),
    loadMore: useCallback(() => setVisible((v) => v + step), [step]),
  }
}
