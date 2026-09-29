export type CustomOrderStatus =
  | 'pending_quote'
  | 'quote_sent'
  | 'deposit_paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

/**
 * Comment l'argent est arrivé. `stripe` se pose tout seul par le webhook ; les
 * autres sont déclarés à la main par l'admin, faute de quoi un acompte réglé
 * par virement n'aurait jamais de date d'encaissement.
 */
export type PaymentMethod = 'stripe' | 'transfer' | 'cash' | 'check'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  stripe:   'Carte bancaire',
  transfer: 'Virement',
  cash:     'Espèces',
  check:    'Chèque',
}

/** Moyens saisissables à la main : Stripe n'a pas à être déclaré. */
export const MANUAL_PAYMENT_METHODS: PaymentMethod[] = ['transfer', 'cash', 'check']

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
  deposit_paid_at: string | null
  /** Moyen d'encaissement. `null` sur les demandes d'avant la migration 041. */
  deposit_method: PaymentMethod | null
  total_amount: number | null
  payment_url: string | null
  stripe_checkout_session_id: string | null

  // Devis PDF — données imprimées sur le document
  quote_number: string | null
  quote_object: string | null
  quote_items: QuoteLineItem[] | null
  quote_issued_at: string | null

  // Devis importé — PDF fabriqué hors de l'app, téléversé par l'admin
  /** Chemin dans le bucket privé `quotes`. Non nul = ce fichier remplace le PDF généré. */
  quote_pdf_path: string | null
  /** Nom d'origine du fichier, réutilisé en pièce jointe. */
  quote_pdf_name: string | null

  // Solde — second encaissement, réclamé avant expédition
  balance_amount: number | null
  balance_payment_url: string | null
  balance_session_id: string | null
  balance_paid_at: string | null
  balance_method: PaymentMethod | null

  // Adresse
  shipping_name: string | null
  shipping_address: string | null
  shipping_city: string | null
  shipping_postal_code: string | null

  // Expédition
  /** Colis déclaré à la création de l'étiquette — une pièce unique n'a pas de poids connu d'avance. */
  package_weight_grams: number | null
  package_length_cm: number | null
  package_width_cm: number | null
  package_height_cm: number | null
  /** Coût de l'étiquette Boxtal, en centimes. Connu seulement après création. */
  shipping_cost: number | null
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

/**
 * Libellés lisibles, indexés par la valeur stockée en base. La colonne
 * `project_type` porte le slug (`deco`), jamais le libellé : sans cette table,
 * la fiche admin et le tableau de bord affichaient « deco » au client.
 */
export const PROJECT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PROJECT_TYPES.map(({ value, label }) => [value, label]),
)

/** Valeur inconnue (demande ancienne, saisie hors liste) rendue telle quelle. */
export function projectTypeLabel(value: string): string {
  return PROJECT_TYPE_LABELS[value] ?? value
}

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

type BalanceFields = Pick<CustomOrder, 'total_amount' | 'deposit_amount' | 'balance_amount'>

/**
 * Plafond du solde : total moins acompte, jamais négatif. `null` quand aucun
 * total n'est enregistré, faute de quoi rien ne borne le solde.
 */
export function balanceCap(order: Pick<CustomOrder, 'total_amount' | 'deposit_amount'>): number | null {
  if (!order.total_amount) return null
  return Math.max(0, order.total_amount - (order.deposit_amount ?? 0))
}

/**
 * Reste à régler après l'acompte, `null` = rien à réclamer.
 *
 * Toujours borné par le total : un `balance_amount` stocké au-delà de
 * `total − acompte` (acompte relevé après coup, solde réclamé en trop) est un
 * solde fantôme. Le prendre tel quel affichait « Reste 40 € » sur un devis réglé
 * en une fois, et laissait déclarer 80 € encaissés pour un projet à 40 €. Un
 * montant stocké plus bas que le plafond reste valable (geste commercial).
 *
 * Sans total, seul un montant déjà réclamé fait foi.
 */
export function computeBalance(order: BalanceFields): number | null {
  const cap = balanceCap(order)
  if (cap === null) return order.balance_amount || null
  if (cap === 0) return null
  if (order.balance_amount && order.balance_amount <= cap) return order.balance_amount
  return cap
}

/** Statuts à partir desquels l'acompte est nécessairement encaissé. */
const PAID_STATUSES: CustomOrderStatus[] = ['deposit_paid', 'in_production', 'shipped', 'delivered']

export interface CustomPaymentState {
  /** Date d'encaissement, `null` si inconnue (demandes d'avant la migration 035). */
  depositPaidAt: string | null
  depositPaid: boolean
  depositMethod: PaymentMethod | null
  balancePaidAt: string | null
  balancePaid: boolean
  balanceMethod: PaymentMethod | null
  /** Reste à encaisser sur le total, `null` si rien n'est dû. */
  outstanding: number | null
  /** Encaissé à ce jour. */
  amountPaid: number
  fullyPaid: boolean
}

type PaymentFields = Pick<CustomOrder,
  'status' | 'deposit_amount' | 'deposit_paid_at' | 'deposit_method' |
  'total_amount' | 'balance_amount' | 'balance_paid_at' | 'balance_method'>

/**
 * État de paiement d'une demande sur-mesure, partagé par la fiche admin et la
 * page de suivi client.
 *
 * L'acompte se déduit du statut autant que de la date : les demandes payées
 * avant l'ajout de `deposit_paid_at` n'ont pas d'horodatage, mais leur statut
 * dit bien que l'argent est arrivé.
 *
 * `outstanding` est `total − encaissé` dès qu'un total existe : le badge de la
 * carte et la ligne « Reste dû » lisent ainsi le même chiffre.
 */
export function paymentState(order: PaymentFields): CustomPaymentState {
  const depositPaid = !!order.deposit_paid_at || PAID_STATUSES.includes(order.status)
  const balancePaid = !!order.balance_paid_at
  const balanceDue = computeBalance(order)

  // Un solde encaissé compte pour ce qu'il vaut réellement, même au-delà du
  // plafond : c'est de l'argent reçu, `balanceAnomaly` se charge de le signaler.
  const amountPaid =
    (depositPaid ? order.deposit_amount ?? 0 : 0) +
    (balancePaid ? order.balance_amount ?? balanceDue ?? 0 : 0)

  let fullyPaid: boolean
  let outstanding: number | null
  if (order.total_amount) {
    const rest = Math.max(0, order.total_amount - amountPaid)
    fullyPaid = amountPaid > 0 && rest === 0
    outstanding = rest > 0 ? rest : null
  } else {
    // Sans total : soldé si le solde est encaissé, ou si rien n'était à
    // réclamer après un acompte reçu.
    fullyPaid = balancePaid || (depositPaid && balanceDue === null && !!order.deposit_amount)
    outstanding = fullyPaid ? null : balanceDue
  }

  return {
    depositPaidAt: order.deposit_paid_at,
    depositPaid,
    depositMethod: order.deposit_method ?? null,
    balancePaidAt: order.balance_paid_at,
    balancePaid,
    balanceMethod: order.balance_method ?? null,
    outstanding,
    amountPaid,
    fullyPaid,
  }
}

export interface BalanceAnomaly {
  /** `phantom` : solde stocké au-delà de `total − acompte`. `overpaid` : encaissé > total. */
  kind: 'phantom' | 'overpaid'
  /** Solde stocké, en centimes. */
  stored: number
  /** Ce que le solde devrait valoir au plus. */
  cap: number
  amountPaid: number
  /** Solde encaissé par Stripe : de l'argent réel, à rembourser, jamais à effacer. */
  paidByStripe: boolean
}

/**
 * Solde incohérent avec le total : repéré par le script de nettoyage et par la
 * fiche admin (bouton « Supprimer le solde »). `null` = rien à corriger.
 */
export function balanceAnomaly(order: PaymentFields): BalanceAnomaly | null {
  const cap = balanceCap(order)
  if (cap === null || !order.balance_amount) return null
  const { amountPaid } = paymentState(order)
  const overpaid = amountPaid > order.total_amount!
  if (order.balance_amount <= cap && !overpaid) return null
  return {
    kind: overpaid ? 'overpaid' : 'phantom',
    stored: order.balance_amount,
    cap,
    amountPaid,
    paidByStripe: !!order.balance_paid_at && order.balance_method === 'stripe',
  }
}
