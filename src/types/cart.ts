export interface CartItem {
  product_id: string
  name: string
  slug: string
  price: number          // centimes, prix unitaire
  image: string | null
  quantity: number
  max_stock: number | null // null = illimité
}
