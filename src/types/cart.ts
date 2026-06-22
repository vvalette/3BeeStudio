export interface CartItem {
  product_id: string
  name: string
  slug: string
  price: number               // centimes, prix effectif (promo si applicable)
  original_price: number | null // prix de base avant promo, null si pas de promo
  image: string | null
  quantity: number
  max_stock: number | null    // null = illimité
  custom_field_values?: Record<string, string>
}
