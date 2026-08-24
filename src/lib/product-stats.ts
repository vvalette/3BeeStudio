import type { ShopOrderItem, ShopOrderStatus } from '@/types/shop-order'

/**
 * Audience des fiches produit : agrégation de l'entonnoir
 * vues → ajouts panier → commandes, consommée par l'admin.
 *
 * Module volontairement pur (aucun import Node) : il est importé aussi bien par
 * les pages serveur que par les composants d'écran. Le hash visiteur et le
 * filtrage des robots vivent dans `product-stats.server.ts`.
 *
 * Le stockage vit dans `shop_product_stats_daily` (migration 036) : un agrégat
 * par produit et par jour, alimenté par POST /api/boutique/view.
 */

/** Fenêtre par défaut des écrans admin. */
export const STATS_WINDOW_DAYS = 30

// ── Jour civil ────────────────────────────────────────────────────────────────

/**
 * Jour civil à Paris au format ISO (YYYY-MM-DD), le même bucket que la RPC SQL.
 * `fr-CA` est le raccourci le plus court vers ce format dans Intl.
 */
export function parisDay(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(date)
}

/** Décale un jour ISO de `n` jours (négatif = vers le passé). */
export function shiftDay(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`) // midi : à l'abri des bascules d'heure d'été
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// ── Agrégation pour l'admin ──────────────────────────────────────────────────

export interface DailyStat {
  product_id: string
  day: string
  views: number
  uniques: number
  carts: number
}

export interface StatsTotals {
  product_id: string
  views: number
  uniques: number
  carts: number
  first_day: string | null
}

/** Projection minimale des commandes nécessaire à l'entonnoir. */
export interface OrderForStats {
  created_at: string
  status: ShopOrderStatus
  items: ShopOrderItem[]
}

export interface ProductStats {
  /** Fenêtre courante (par défaut 30 jours). */
  views: number
  uniques: number
  carts: number
  orders: number
  units: number
  revenue: number
  /** Vues des 7 derniers jours, sous-ensemble de la fenêtre. */
  views7: number
  /** Vues sur la fenêtre précédente de même durée — sert à la tendance. */
  viewsPrev: number
  /** Variation en % vs fenêtre précédente. `null` si rien à comparer. */
  trend: number | null
  /** Vues jour par jour, du plus ancien au plus récent (longueur = fenêtre). */
  spark: number[]
  /** commandes / visiteurs uniques. `null` si aucun visiteur. */
  conversion: number | null
  /** ajouts panier / visiteurs uniques. `null` si aucun visiteur. */
  cartRate: number | null
  /** Cumul depuis la mise en ligne (limité à la rétention de 13 mois). */
  lifetimeViews: number
  lifetimeUniques: number
}

/** Une commande annulée ou jamais payée ne compte pas comme une conversion. */
export function countsAsSale(status: ShopOrderStatus): boolean {
  return status !== 'pending_payment' && status !== 'cancelled'
}

export function emptyStats(days: number = STATS_WINDOW_DAYS): ProductStats {
  return {
    views: 0, uniques: 0, carts: 0, orders: 0, units: 0, revenue: 0,
    views7: 0, viewsPrev: 0, trend: null,
    spark: Array<number>(days).fill(0),
    conversion: null, cartRate: null,
    lifetimeViews: 0, lifetimeUniques: 0,
  }
}

/**
 * Assemble l'entonnoir par produit.
 *
 * `daily` doit couvrir 2× la fenêtre (fenêtre courante + précédente) pour que la
 * tendance ait un point de comparaison ; les jours hors fenêtre sont ignorés.
 */
export function buildProductStats({
  daily,
  orders,
  totals = [],
  days = STATS_WINDOW_DAYS,
  today = parisDay(),
}: {
  daily: DailyStat[]
  orders: OrderForStats[]
  totals?: StatsTotals[]
  days?: number
  today?: string
}): Map<string, ProductStats> {
  const from     = shiftDay(today, -(days - 1))
  const fromPrev = shiftDay(today, -(days * 2 - 1))
  const from7    = shiftDay(today, -6)

  // Index jour → position dans la sparkline (0 = le plus ancien).
  const slot = new Map<string, number>()
  for (let i = 0; i < days; i++) slot.set(shiftDay(from, i), i)

  const stats = new Map<string, ProductStats>()
  const get = (id: string): ProductStats => {
    let s = stats.get(id)
    if (!s) { s = emptyStats(days); stats.set(id, s) }
    return s
  }

  for (const row of daily) {
    const s = get(row.product_id)
    const index = slot.get(row.day)
    if (index !== undefined) {
      s.views   += row.views
      s.uniques += row.uniques
      s.carts   += row.carts
      s.spark[index] += row.views
      if (row.day >= from7) s.views7 += row.views
    } else if (row.day >= fromPrev && row.day < from) {
      s.viewsPrev += row.views
    }
  }

  for (const order of orders) {
    if (!countsAsSale(order.status)) continue
    const day = parisDay(new Date(order.created_at))
    if (day < from || day > today) continue
    // Un produit acheté en 3 exemplaires = 1 conversion, 3 unités.
    const seen = new Set<string>()
    for (const item of order.items ?? []) {
      const s = get(item.product_id)
      s.units   += item.quantity
      s.revenue += item.unit_price * item.quantity
      if (!seen.has(item.product_id)) { s.orders += 1; seen.add(item.product_id) }
    }
  }

  for (const total of totals) {
    const s = get(total.product_id)
    s.lifetimeViews   = total.views
    s.lifetimeUniques = total.uniques
  }

  for (const s of stats.values()) {
    s.conversion = s.uniques > 0 ? s.orders / s.uniques : null
    s.cartRate   = s.uniques > 0 ? s.carts / s.uniques : null
    s.trend      = s.viewsPrev > 0 ? (s.views - s.viewsPrev) / s.viewsPrev : null
  }

  return stats
}

// ── Série temporelle globale ─────────────────────────────────────────────────

export interface DayPoint {
  day: string
  views: number
  uniques: number
  carts: number
}

/** Courbe tous produits confondus, un point par jour, du plus ancien au plus récent. */
export function buildDailySeries(
  daily: DailyStat[],
  days: number = STATS_WINDOW_DAYS,
  today: string = parisDay(),
): DayPoint[] {
  const from = shiftDay(today, -(days - 1))
  const points = new Map<string, DayPoint>()
  for (let i = 0; i < days; i++) {
    const day = shiftDay(from, i)
    points.set(day, { day, views: 0, uniques: 0, carts: 0 })
  }
  for (const row of daily) {
    const point = points.get(row.day)
    if (!point) continue
    point.views   += row.views
    // Somme des uniques quotidiens : un visiteur revenu deux jours de suite
    // compte deux fois. C'est la convention de toutes les régies (« visiteurs
    // par jour »), et la seule calculable sans conserver les empreintes.
    point.uniques += row.uniques
    point.carts   += row.carts
  }
  return [...points.values()]
}
