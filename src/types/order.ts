export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'processing'
  | 'printing'
  | 'printed'
  | 'shipped'
  | 'delivered'

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

  // Stripe
  stripe_checkout_session_id: string | null
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'En attente de paiement',
  confirmed: 'Commande confirmée',
  processing: 'En traitement',
  printing: 'Impression en cours',
  printed: 'Imprimé',
  shipped: 'Expédié',
  delivered: 'Livré',
}

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  'confirmed',
  'processing',
  'printing',
  'printed',
  'shipped',
  'delivered',
]

// Prix unitaire en centimes selon la quantité.
// Cible : ~0,50 €/porte-clé net au gros volume (charges micro ~13 %, coût revient ~1 €),
// un peu plus de marge sur les petites quantités.
//   qté   prix    net/pc (≈ prix×0,87 − 1 €)
//   5-9   2,90 €   ~1,52 €
//   10-49 2,50 €   ~1,18 €
//   50-99 2,20 €   ~0,91 €
//   100+  1,90 €   ~0,65 €
//   250+  1,70 €   ~0,48 €
export function getUnitPrice(quantity: number): number {
  if (quantity >= 250) return 170
  if (quantity >= 100) return 190
  if (quantity >= 50) return 220
  if (quantity >= 25) return 240
  if (quantity >= 10) return 260
  return 290
}

// Frais de port en centimes selon la quantité. Offert au-delà du seuil.
export const FREE_SHIPPING_QTY = 100

export function getShipping(quantity: number): number {
  if (quantity >= FREE_SHIPPING_QTY) return 0
  if (quantity >= 50) return 690
  return 490
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
