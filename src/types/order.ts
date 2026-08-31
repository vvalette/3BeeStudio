export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface Order {
  id: string
  created_at: string
  updated_at: string

  // Client
  company: string
  email: string
  phone: string
  sector: string

  // Commande
  quantity: number
  nfc_url: string
  logo_url: string

  // Prix (en centimes)
  unit_price: number
  total_amount: number
  deposit_amount: number

  // Statut
  status: OrderStatus
  tracking_number: string | null
  tracking_url: string | null
  admin_notes: string | null

  // Adresse de livraison
  shipping_name: string | null
  shipping_address: string | null
  shipping_address2: string | null
  shipping_city: string | null
  shipping_postal_code: string | null
  shipping_country: string | null

  // Boxtal (expédition)
  boxtal_order_id: string | null
  shipping_cost: number | null // coût réel HT de l'étiquette, centimes

  // Stripe
  stripe_checkout_session_id: string | null
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'En attente de paiement',
  confirmed: 'Commande confirmée',
  processing: 'En préparation',
  shipped: 'Expédié',
  delivered: 'Livré',
  cancelled: 'Annulée',
}

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  'confirmed',
  'processing',
  'shipped',
  'delivered',
]

// Prix unitaire en centimes selon la quantité.
// Cible : ~0,50 €/porte-clé net au gros volume (charges micro ~13 %, coût revient ~1 €),
// un peu plus de marge sur les petites quantités.
//   qté     prix    net/pc (≈ prix×0,87 − 1 €)
//   5-9     2,90 €   ~1,52 €
//   10-24   2,60 €   ~1,26 €
//   25-49   2,40 €   ~1,09 €
//   50-99   2,20 €   ~0,91 €
//   100-249 1,90 €   ~0,65 €
//   250+    1,70 €   ~0,48 €
// Paliers dégressifs, du plus gros volume au plus petit. Source unique : le prix
// affiché au client (grille tarifaire de /nfc, étape quantité) est lu ici, il ne
// peut donc pas diverger du prix facturé.
export const PRICE_TIERS = [
  { min: 250, unitPrice: 170 },
  { min: 100, unitPrice: 190 },
  { min: 50,  unitPrice: 220 },
  { min: 25,  unitPrice: 240 },
  { min: 10,  unitPrice: 260 },
  { min: 5,   unitPrice: 290 },
] as const

// Quantité minimale de commande (reprise par le schéma de l'étape quantité).
export const MIN_ORDER_QTY = 5

export function getUnitPrice(quantity: number): number {
  const tier = PRICE_TIERS.find((t) => quantity >= t.min)
  return tier ? tier.unitPrice : PRICE_TIERS[PRICE_TIERS.length - 1].unitPrice
}

// Frais de port en centimes : tarif unique, offert au-delà du seuil.
export const FREE_SHIPPING_QTY = 100
export const SHIPPING_COST = 690

export function getShipping(quantity: number): number {
  return quantity >= FREE_SHIPPING_QTY ? 0 : SHIPPING_COST
}

export function calcOrder(quantity: number) {
  const unitPrice = getUnitPrice(quantity)
  const subtotal = unitPrice * quantity
  const shipping = getShipping(quantity)
  const total = subtotal + shipping
  return { unitPrice, subtotal, shipping, total }
}

// La destination NFC peut être une URL (https) ou une vCard.
export function isVCard(value: string): boolean {
  return typeof value === 'string' && value.startsWith('BEGIN:VCARD')
}

// Mémoire utile d'une puce NTAG213 (144 octets) moins l'overhead NDEF → marge sûre.
export const NFC_CHIP_BYTE_LIMIT = 132

export function byteLength(str: string): number {
  return new TextEncoder().encode(str).length
}

// Rendu lisible de la destination (pour récap, suivi, admin).
export function formatDestination(value: string): string {
  if (!value) return ''
  if (isVCard(value)) {
    const name = /FN:(.*)/.exec(value)?.[1]?.trim() ?? 'Contact'
    const tel = /TEL[^:]*:(.*)/.exec(value)?.[1]?.trim()
    const email = /EMAIL[^:]*:(.*)/.exec(value)?.[1]?.trim()
    const parts = [tel, email].filter(Boolean)
    return parts.length ? `${name} · ${parts.join(' · ')}` : name
  }
  return value
}
