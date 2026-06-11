import type { OrderStatus } from '@/types/order'
import type { CustomOrderStatus } from '@/types/custom-order'

// ── NFC orders ────────────────────────────────────────────────────────────────

export const STATUS_PILL: Record<OrderStatus, string> = {
  pending_payment: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20',
  confirmed:       'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  processing:      'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  printing:        'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  printed:         'bg-lime-500/15 text-lime-400 border border-lime-500/20',
  shipped:         'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
  delivered:       'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
}

export const STATUS_ACCENT: Record<OrderStatus, string> = {
  pending_payment: '#71717a',
  confirmed:       '#60a5fa',
  processing:      '#c084fc',
  printing:        '#fb923c',
  printed:         '#a3e635',
  shipped:         '#22d3ee',
  delivered:       '#34d399',
}

export const STATUS_SHORT_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Impayées',
  confirmed:       'Confirmées',
  processing:      'En traitement',
  printing:        'En impression',
  printed:         'Imprimées',
  shipped:         'Expédiées',
  delivered:       'Livrées',
}

export const ALL_STATUSES: OrderStatus[] = [
  'pending_payment', 'confirmed', 'processing', 'printing', 'printed', 'shipped', 'delivered',
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
