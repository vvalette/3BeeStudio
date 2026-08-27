export interface ProductCustomField {
  key: string
  label: string
  label_en?: string
  required: boolean
}

/**
 * Coloris proposé sur une fiche produit (colonne `shop_products.colors`).
 *
 * Un objet imprimé à la demande sort dans la couleur de la bobine chargée : une
 * fiche par couleur fragmenterait le stock et le référencement pour une pièce
 * identique. Le choix se fait donc à l'achat et se fige sur la ligne de commande.
 *
 * `hex` n'est qu'une pastille d'affichage, pas une valeur de production : c'est
 * `key` qui identifie le coloris de bout en bout (panier, checkout, commande).
 */
export interface ProductColor {
  key: string
  label: string
  label_en?: string
  /** Pastille affichée dans le sélecteur, ex. `#1A1A1C`. */
  hex: string
}

/** Coloris figé sur une ligne de panier ou de commande. */
export interface SelectedColor {
  key: string
  label: string
}

/**
 * 'physical' = objet imprimé et expédié · 'digital' = fichier STL téléchargeable.
 * Un même objet vendu dans les deux formats = deux produits (cf. « Dupliquer »).
 */
export type ProductType = 'physical' | 'digital'

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
  /**
   * Maillage d'APERÇU, bucket public — alimente le viewer 3D des fiches produit.
   * Extractible par nature (le navigateur le charge) : sur un produit numérique,
   * y mettre une version décimée, jamais le fichier vendu.
   */
  stl_url: string | null
  custom_fields: ProductCustomField[]
  /** Coloris proposés au client. Vide = pas de choix de couleur sur la fiche. */
  colors: ProductColor[]
  category: string | null
  featured: boolean
  model_rotation: { x: number; y: number; z: number } | null

  // ── Produit numérique ──
  product_type: ProductType
  /** Chemin dans le bucket PRIVÉ `stl-downloads`. Ne doit jamais atteindre le client. */
  digital_file_path: string | null
  digital_file_name: string | null
  digital_file_size: number | null // octets
}

/**
 * Produit tel qu'exposé au client, sans le chemin du fichier vendu.
 *
 * ⚠️ Ce type documente l'intention mais ne suffit PAS : le typage structurel de
 * TypeScript accepte un `ShopProduct` complet là où un `PublicShopProduct` est
 * attendu (les propriétés en trop ne sont refusées que sur un littéral). La vraie
 * protection est l'appel à `toPublicProduct()` côté serveur, qui retire le champ
 * pour de bon avant qu'il n'entre dans le payload RSC.
 */
export type PublicShopProduct = Omit<ShopProduct, 'digital_file_path'>

export function toPublicProduct(product: ShopProduct): PublicShopProduct {
  const rest: Record<string, unknown> = { ...product }
  delete rest.digital_file_path
  return rest as PublicShopProduct
}

export function isDigital(product: Pick<ShopProduct, 'product_type'>): boolean {
  return product.product_type === 'digital'
}

// Champs utilisés par les cartes catalogue (BoutiqueCatalog/ProductsGrid) — évite de transférer
// la description markdown complète FR+EN, les custom_fields et les IDs Stripe pour un simple listing.
export type ShopProductCard = Pick<ShopProduct,
  | 'id' | 'slug' | 'name' | 'name_en' | 'subtitle' | 'subtitle_en'
  | 'price' | 'sale_price' | 'stock' | 'images' | 'stl_url' | 'model_rotation'
  | 'category' | 'featured' | 'product_type'
>

export const SHOP_FREE_SHIPPING_THRESHOLD = 5000 // 50 € en centimes
export const SHOP_SHIPPING_PRICE = 690           // 6,90 € — domicile (Colissimo)
export const SHOP_RELAY_SHIPPING_PRICE = 390     // 3,90 € — point relais (Mondial Relay)

/**
 * Frais de port selon le mode de livraison.
 * Le relais est nettement moins cher à l'achat côté Boxtal (~5 € contre ~11 €
 * en Colissimo domicile), on répercute cet écart au client.
 * Le seuil de gratuité s'applique aux deux modes ; le retrait studio est gratuit.
 *
 * ⚠️ `subtotal` doit être le sous-total **physique** (cf. splitCart) : un fichier
 * STL ne coûte rien à expédier et ne doit pas faire franchir le seuil de
 * gratuité. Sans ça, 45 € de fichiers + un objet à 5 € offriraient le port.
 *
 * ⚠️ Un sous-total à 0 renvoie quand même le tarif plein (comportement historique,
 * couvert par les tests) : c'est à l'appelant de court-circuiter quand il n'y a
 * rien à expédier — panier vide ou 100 % numérique.
 */
export function calcShopShipping(
  subtotal: number,
  mode: 'delivery' | 'pickup' | 'relay' | 'digital' = 'delivery',
): number {
  if (mode === 'pickup' || mode === 'digital') return 0
  if (subtotal >= SHOP_FREE_SHIPPING_THRESHOLD) return 0
  return mode === 'relay' ? SHOP_RELAY_SHIPPING_PRICE : SHOP_SHIPPING_PRICE
}

export interface CartSplitLine {
  product_type: ProductType
  unit_price: number
  quantity: number
}

/**
 * Sépare un panier mixte en part physique et part numérique.
 *
 * Un panier peut contenir les deux (un support imprimé + son fichier) : le port
 * ne se calcule alors que sur la part physique, et l'adresse de livraison n'est
 * requise que s'il reste quelque chose à expédier.
 */
export function splitCart(lines: CartSplitLine[]) {
  let physicalSubtotal = 0
  let digitalSubtotal = 0

  for (const l of lines) {
    const amount = l.unit_price * l.quantity
    if (l.product_type === 'digital') digitalSubtotal += amount
    else physicalSubtotal += amount
  }

  return {
    physicalSubtotal,
    digitalSubtotal,
    subtotal: physicalSubtotal + digitalSubtotal,
    hasPhysical: physicalSubtotal > 0,
    hasDigital: digitalSubtotal > 0,
  }
}

/**
 * Mode de livraison imposé par la composition du panier.
 * Un panier 100 % numérique n'a ni adresse, ni port, ni expédition Boxtal : le
 * sélecteur de livraison du checkout doit disparaître, pas juste afficher 0 €.
 */
export function resolveDeliveryMode(
  hasPhysical: boolean,
  chosen: 'delivery' | 'pickup' | 'relay',
): 'delivery' | 'pickup' | 'relay' | 'digital' {
  return hasPhysical ? chosen : 'digital'
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
  /** `key` du coloris choisi — absent quand le produit n'en propose pas. */
  color?: string
  custom_field_values?: Record<string, string>
}

export interface MergedCartLine {
  product_id: string
  quantity: number
  color?: string
  custom_field_values?: Record<string, string>
}

/**
 * Identité d'une ligne de panier : un même produit dans deux coloris fait deux
 * lignes distinctes, avec leurs quantités propres.
 *
 * Sans coloris la clé reste l'`id` du produit tel quel : les paniers déjà en
 * localStorage et les commandes existantes gardent exactement la même clé.
 */
export function cartLineKey(productId: string, color?: string | null): string {
  return color ? `${productId}|${color}` : productId
}

/** Retrouve un coloris par sa clé — `null` si le produit ne le propose pas (ou plus). */
export function findProductColor(
  colors: ProductColor[] | null | undefined,
  key: string | null | undefined,
): ProductColor | null {
  if (!key) return null
  return colors?.find((c) => c.key === key) ?? null
}

/** Libellé d'un coloris dans la langue du visiteur (retombe sur le FR). */
export function colorLabel(color: Pick<ProductColor, 'label' | 'label_en'>, locale: string): string {
  return locale === 'en' && color.label_en ? color.label_en : color.label
}

// Fusionne les quantités d'une même ligne envoyées dans le panier (sécurité côté API) —
// une ligne = un produit ET un coloris. Conserve les custom_field_values de la
// première occurrence rencontrée pour chaque ligne.
export function mergeCartQuantities(
  items: CartLineInput[],
): Map<string, MergedCartLine> {
  const merged = new Map<string, MergedCartLine>()
  for (const it of items) {
    const key = cartLineKey(it.product_id, it.color)
    const existing = merged.get(key)
    merged.set(key, {
      product_id:          it.product_id,
      color:               it.color,
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
