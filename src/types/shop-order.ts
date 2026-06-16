export type ShopOrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface ShopOrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number // centimes
}

export interface ShopOrder {
  id: string
  created_at: string
  updated_at: string

  // Client
  email: string
  name: string
  phone: string | null

  // Panier
  items: ShopOrderItem[]

  // Montants (centimes)
  subtotal: number
  shipping: number
  total_amount: number

  // Statut
  status: ShopOrderStatus

  // Adresse
  shipping_name: string | null
  shipping_address: string | null
  shipping_address2: string | null
  shipping_city: string | null
  shipping_postal_code: string | null
  shipping_country: string | null

  // Expédition
  tracking_number: string | null
  tracking_url: string | null

  // Admin
  admin_notes: string | null

  // Stripe
  stripe_checkout_session_id: string | null
}

export const SHOP_STATUS_LABELS: Record<ShopOrderStatus, string> = {
  pending_payment: 'En attente de paiement',
  confirmed:       'Commande confirmée',
  processing:      'En préparation',
  shipped:         'Expédiée',
  delivered:       'Livrée',
  cancelled:       'Annulée',
}

export const SHOP_STATUS_STEPS: ShopOrderStatus[] = [
  'confirmed',
  'processing',
  'shipped',
  'delivered',
]
