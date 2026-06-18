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
  price: number        // centimes (prix de base)
  sale_price: number | null // centimes (prix promo, null = pas de promo)
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

/** Retourne le prix effectif (promo si disponible, sinon prix de base) */
export function effectivePrice(product: ShopProduct): number {
  return product.sale_price ?? product.price
}

/** Retourne le % de réduction arrondi, ou null si pas de promo */
export function discountPercent(product: ShopProduct): number | null {
  if (!product.sale_price) return null
  return Math.round((1 - product.sale_price / product.price) * 100)
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
