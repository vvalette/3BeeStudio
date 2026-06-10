import type { OrderStatus } from '@/types/order'

// Couleurs de statut partagées (liste admin, détail admin, suivi client).
// Classes Tailwind complètes — ne pas composer dynamiquement.

export const STATUS_PILL: Record<OrderStatus, string> = {
  pending_payment: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20',
  confirmed: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  processing: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  printing: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  printed: 'bg-lime-500/15 text-lime-400 border border-lime-500/20',
  shipped: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
  delivered: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
}

export const STATUS_ACCENT: Record<OrderStatus, string> = {
  pending_payment: '#71717a',
  confirmed: '#60a5fa',
  processing: '#c084fc',
  printing: '#fb923c',
  printed: '#a3e635',
  shipped: '#22d3ee',
  delivered: '#34d399',
}

// Libellés courts au féminin (« commande … ») pour les filtres de la liste admin.
export const STATUS_SHORT_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Impayées',
  confirmed: 'Confirmées',
  processing: 'En traitement',
  printing: 'En impression',
  printed: 'Imprimées',
  shipped: 'Expédiées',
  delivered: 'Livrées',
}

// Tous les statuts, dans l'ordre du cycle de vie.
export const ALL_STATUSES: OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'processing',
  'printing',
  'printed',
  'shipped',
  'delivered',
]
