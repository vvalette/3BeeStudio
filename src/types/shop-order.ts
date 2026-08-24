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
/**
 * 'digital' = panier 100 % fichiers : ni adresse, ni port, ni expédition Boxtal.
 * Un panier mixte reste 'delivery' / 'relay' / 'pickup' (il y a un colis à sortir).
 */
export type DeliveryMode = 'delivery' | 'pickup' | 'relay' | 'digital'

export interface ShopOrderItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number // centimes
  weight_grams?: number // poids unitaire du produit au moment de la commande
  /** Snapshot : le produit peut changer de type après la commande. */
  is_digital?: boolean
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
  /** Remise appliquée : promo newsletter OU code promo (jamais les deux sur le sous-total). */
  discount_amount: number
  /** Code promo utilisé, figé sur la commande. `null` = remise newsletter ou aucune. */
  promo_code: string | null
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

  // ── Produits numériques ──
  has_digital: boolean
  has_physical: boolean
  /**
   * Horodatage du renoncement explicite au droit de rétractation
   * (art. L221-28 3° du Code de la consommation). Obligatoire dès qu'un fichier
   * est vendu : sans cette preuve, le client garde ses 14 jours.
   */
  digital_waiver_at: string | null
}

/** Droit de téléchargement ouvert après paiement (table shop_order_downloads). */
export interface ShopOrderDownload {
  id: string
  order_id: string
  product_id: string
  file_name: string
  download_count: number
  max_downloads: number
  expires_at: string
  last_download_at: string | null
}

/** Vue client d'un droit de téléchargement — le chemin du fichier n'y figure pas. */
export type PublicDownload = Omit<ShopOrderDownload, 'order_id'> & { available: boolean }

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
