export type CustomOrderStatus =
  | 'pending_quote'
  | 'quote_sent'
  | 'deposit_paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

/** Une ligne du tableau du devis. `unit_price` est en centimes. */
export interface QuoteLineItem {
  label: string
  /** Précisions sous le libellé, une par ligne (matière, finition, options). */
  detail?: string
  quantity: number
  unit_price: number
}

export interface CustomOrder {
  id: string
  created_at: string
  updated_at: string

  // Client
  name: string
  company: string | null
  email: string
  phone: string

  // Projet
  project_type: string
  description: string
  budget_range: string | null
  deadline: string | null
  reference_file_url: string | null

  // Statut
  status: CustomOrderStatus
  admin_notes: string | null

  // Devis & paiement — acompte
  deposit_amount: number | null
  total_amount: number | null
  payment_url: string | null
  stripe_checkout_session_id: string | null

  // Devis PDF — données imprimées sur le document
  quote_number: string | null
  quote_object: string | null
  quote_items: QuoteLineItem[] | null
  quote_issued_at: string | null

  // Solde — second encaissement, réclamé avant expédition
  balance_amount: number | null
  balance_payment_url: string | null
  balance_session_id: string | null
  balance_paid_at: string | null

  // Adresse
  shipping_name: string | null
  shipping_address: string | null
  shipping_city: string | null
  shipping_postal_code: string | null

  // Expédition
  tracking_number: string | null
  tracking_url: string | null
  boxtal_order_id: string | null
}

export const CUSTOM_STATUS_LABELS: Record<CustomOrderStatus, string> = {
  pending_quote:  'Devis en préparation',
  quote_sent:     'Devis envoyé',
  deposit_paid:   'Acompte reçu',
  in_production:  'En production',
  shipped:        'Expédié',
  delivered:      'Livré',
  cancelled:      'Annulé',
}

export const CUSTOM_STATUS_STEPS: CustomOrderStatus[] = [
  'pending_quote',
  'quote_sent',
  'deposit_paid',
  'in_production',
  'shipped',
  'delivered',
]

export const PROJECT_TYPES = [
  { value: 'cadeau',      label: 'Cadeau personnalisé' },
  { value: 'deco',        label: 'Objet déco / design' },
  { value: 'prototype',   label: 'Prototype produit' },
  { value: 'mecanique',   label: 'Pièce mécanique / fonctionnelle' },
  { value: 'reparation',  label: 'Réparation / remplacement' },
  { value: 'autre',       label: 'Autre projet' },
] as const

export const BUDGET_RANGES = [
  'Moins de 50 €',
  '50 € – 200 €',
  '200 € – 500 €',
  '500 € – 1 000 €',
  'Plus de 1 000 €',
] as const

export const DEADLINES = [
  'Urgent (moins de 2 semaines)',
  'Environ 1 mois',
  '2 à 3 mois',
  'Pas de contrainte',
] as const

// Clés i18n alignées sur l'ordre de BUDGET_RANGES / DEADLINES (valeur stockée = constante canonique FR)
export const BUDGET_KEYS = ['under50', '50to200', '200to500', '500to1000', 'over1000'] as const
export const DEADLINE_KEYS = ['urgent', 'month', 'quarter', 'flexible'] as const

/**
 * Reste à régler après l'acompte. `balance_amount` fait foi une fois la demande
 * de solde émise (l'admin peut l'avoir ajusté) ; avant ça, c'est la différence
 * entre le total estimé et l'acompte. `null` = rien à réclamer.
 */
export function computeBalance(order: Pick<CustomOrder, 'total_amount' | 'deposit_amount' | 'balance_amount'>): number | null {
  if (order.balance_amount) return order.balance_amount
  if (!order.total_amount || !order.deposit_amount) return null
  const rest = order.total_amount - order.deposit_amount
  return rest > 0 ? rest : null
}
