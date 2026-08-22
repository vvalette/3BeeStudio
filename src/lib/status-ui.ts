import type { OrderStatus } from '@/types/order'
import type { CustomOrderStatus } from '@/types/custom-order'
import type { ShopOrderStatus } from '@/types/shop-order'

// ── NFC orders ────────────────────────────────────────────────────────────────

export const STATUS_PILL: Record<OrderStatus, string> = {
  pending_payment: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20',
  confirmed:       'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  processing:      'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  shipped:         'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
  delivered:       'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  cancelled:       'bg-red-500/15 text-red-400 border border-red-500/20',
}

export const STATUS_ACCENT: Record<OrderStatus, string> = {
  pending_payment: '#71717a',
  confirmed:       '#60a5fa',
  processing:      '#c084fc',
  shipped:         '#22d3ee',
  delivered:       '#34d399',
  cancelled:       '#f87171',
}

export const STATUS_SHORT_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Impayées',
  confirmed:       'Confirmées',
  processing:      'En préparation',
  shipped:         'Expédiées',
  delivered:       'Livrées',
  cancelled:       'Annulées',
}

export const ALL_STATUSES: OrderStatus[] = [
  'pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled',
]

// ── Custom orders ─────────────────────────────────────────────────────────────

export const CUSTOM_STATUS_PILL: Record<CustomOrderStatus, string> = {
  pending_quote:  'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20',
  quote_sent:     'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  deposit_paid:   'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  in_production:  'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  shipped:        'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
  delivered:      'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  cancelled:      'bg-red-500/15 text-red-400 border border-red-500/20',
}

export const CUSTOM_STATUS_ACCENT: Record<CustomOrderStatus, string> = {
  pending_quote:  '#71717a',
  quote_sent:     '#60a5fa',
  deposit_paid:   '#c084fc',
  in_production:  '#fb923c',
  shipped:        '#22d3ee',
  delivered:      '#34d399',
  cancelled:      '#f87171',
}

export const CUSTOM_STATUS_SHORT_LABELS: Record<CustomOrderStatus, string> = {
  pending_quote:  'Devis à préparer',
  quote_sent:     'Devis envoyé',
  deposit_paid:   'Acompte reçu',
  in_production:  'En production',
  shipped:        'Expédiées',
  delivered:      'Livrées',
  cancelled:      'Annulées',
}

// ── Shop orders ───────────────────────────────────────────────────────────────

export const SHOP_STATUS_PILL: Record<ShopOrderStatus, string> = {
  pending_payment: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20',
  confirmed:       'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  processing:      'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  shipped:         'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
  delivered:       'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  cancelled:       'bg-red-500/15 text-red-400 border border-red-500/20',
}

export const SHOP_STATUS_ACCENT: Record<ShopOrderStatus, string> = {
  pending_payment: '#71717a',
  confirmed:       '#60a5fa',
  processing:      '#c084fc',
  shipped:         '#22d3ee',
  delivered:       '#34d399',
  cancelled:       '#f87171',
}

export const SHOP_STATUS_SHORT_LABELS: Record<ShopOrderStatus, string> = {
  pending_payment: 'Impayées',
  confirmed:       'Confirmées',
  processing:      'En préparation',
  shipped:         'Expédiées',
  delivered:       'Livrées',
  cancelled:       'Annulées',
}

export const ALL_SHOP_STATUSES: ShopOrderStatus[] = [
  'pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled',
]

/**
 * Commandes boutique qui demandent encore une action de l'admin.
 *
 * `shipped` en est exclu : une fois l'étiquette générée et le colis remis, il
 * n'y a plus rien à faire — le webhook Boxtal fait passer la commande en
 * `delivered` tout seul. La laisser dans « À traiter » gonflait le compteur avec
 * des lignes sur lesquelles on ne peut pas agir.
 */
export function isShopOrderActionable(status: ShopOrderStatus): boolean {
  return status !== 'shipped' && status !== 'delivered' && status !== 'cancelled'
}
