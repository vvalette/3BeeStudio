export interface ProductCustomField {
  key: string
  label: string
  label_en?: string
  required: boolean
}

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
  custom_fields: ProductCustomField[]
  category: string | null
  featured: boolean
  model_rotation: { x: number; y: number; z: number } | null
}

// Champs utilisés par les cartes catalogue (BoutiqueCatalog/ProductsGrid) — évite de transférer
// la description markdown complète FR+EN, les custom_fields et les IDs Stripe pour un simple listing.
export type ShopProductCard = Pick<ShopProduct,
  | 'id' | 'slug' | 'name' | 'name_en' | 'subtitle' | 'subtitle_en'
  | 'price' | 'sale_price' | 'stock' | 'images' | 'stl_url' | 'model_rotation'
  | 'category' | 'featured'
>

export const SHOP_FREE_SHIPPING_THRESHOLD = 5000 // 50 € en centimes
export const SHOP_SHIPPING_PRICE = 690           // 6,90 €

export function calcShopShipping(subtotal: number): number {
  return subtotal >= SHOP_FREE_SHIPPING_THRESHOLD ? 0 : SHOP_SHIPPING_PRICE
}

/** Retourne le prix effectif (promo si disponible, sinon prix de base) */
export function effectivePrice(product: Pick<ShopProduct, 'price' | 'sale_price'>): number {
  return product.sale_price ?? product.price
}

/** Retourne le % de réduction arrondi, ou null si pas de promo */
export function discountPercent(product: Pick<ShopProduct, 'price' | 'sale_price'>): number | null {
  if (!product.sale_price) return null
  return Math.round((1 - product.sale_price / product.price) * 100)
}

export interface CartLineInput {
  product_id: string
  quantity: number
  custom_field_values?: Record<string, string>
}

// Fusionne les quantités d'un même produit envoyées dans le panier (sécurité côté API) —
// conserve les custom_field_values de la première occurrence rencontrée pour chaque produit.
export function mergeCartQuantities(
  items: CartLineInput[],
): Map<string, { quantity: number; custom_field_values?: Record<string, string> }> {
  const merged = new Map<string, { quantity: number; custom_field_values?: Record<string, string> }>()
  for (const it of items) {
    const existing = merged.get(it.product_id)
    merged.set(it.product_id, {
      quantity:            (existing?.quantity ?? 0) + it.quantity,
      custom_field_values: existing?.custom_field_values ?? it.custom_field_values,
    })
  }
  return merged
}

// Réduction newsletter boutique : -10% du sous-total, arrondie à l'entier le plus proche.
export function computeNewsletterDiscount(subtotal: number): number {
  return Math.round(subtotal * 0.1)
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
