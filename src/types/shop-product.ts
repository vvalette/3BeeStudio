export interface ShopProduct {
  id: string
  created_at: string
  updated_at: string
  name: string
  slug: string
  subtitle: string | null
  description: string
  name_en: string | null
  subtitle_en: string | null
  description_en: string | null
  price: number        // centimes
  images: string[]
  stock: number | null // null = illimité
  active: boolean
  weight_grams: number
  stripe_product_id: string | null
  stripe_price_id: string | null
  stl_url: string | null
}

export const SHOP_FREE_SHIPPING_THRESHOLD = 5000 // 50 € en centimes
export const SHOP_SHIPPING_PRICE = 490           // 4,90 €

export function calcShopShipping(subtotal: number): number {
  return subtotal >= SHOP_FREE_SHIPPING_THRESHOLD ? 0 : SHOP_SHIPPING_PRICE
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
