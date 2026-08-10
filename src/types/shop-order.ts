export type ShopOrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

/**
 * 'relay' = point relais : l'offre Boxtal la moins chère (~5 € contre ~11 € en
 * Colissimo domicile), mais l'API impose un pickupPointCode → le client choisit
 * son relais au checkout.
 */
export type DeliveryMode = 'delivery' | 'pickup' | 'relay'

export interface ShopOrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number // centimes
  weight_grams?: number // poids unitaire du produit au moment de la commande
  custom_field_values?: Array<{ key: string; label: string; value: string }>
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
  discount_amount: number
  shipping: number
  total_amount: number

  // Statut
  status: ShopOrderStatus

  // Mode de livraison
  delivery_mode: DeliveryMode

  // Point relais (delivery_mode === 'relay')
  pickup_point_code:        string | null
  pickup_point_name:        string | null
  pickup_point_street:      string | null
  pickup_point_city:        string | null
  pickup_point_postal_code: string | null

  // Adresse
  shipping_name: string | null
  shipping_address: string | null
  shipping_address2: string | null
  shipping_city: string | null
  shipping_postal_code: string | null
  shipping_country: string | null

  // Expédition
  shipping_cost: number | null // coût réel HT de l'étiquette Boxtal, centimes
  tracking_number: string | null
  tracking_url: string | null
  boxtal_order_id: string | null

  // Admin
  admin_notes: string | null

  // Stripe
  stripe_checkout_session_id: string | null

  // Locale utilisé lors de la commande
  locale?: string
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
