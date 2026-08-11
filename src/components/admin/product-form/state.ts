import type { ShopProduct, ProductCustomField, ProductType } from '@/types/shop-product'
import { generateSlug } from '@/types/shop-product'

// État consolidé du formulaire produit admin + conversion vers le payload API.
// Extrait d'AdminBoutiqueProductForm.tsx (34 useState → un objet + états locaux de section).

export interface ProductFormState {
  name: string
  slug: string
  subtitle: string
  description: string
  nameEn: string
  subtitleEn: string
  descriptionEn: string
  priceEuros: string
  salePriceEuros: string
  images: string[]
  stlUrl: string | null
  stock: string
  weightGrams: string
  customFields: ProductCustomField[]
  category: string
  featured: boolean
  modelRotation: { x: number; y: number; z: number }
  active: boolean

  // ── Produit numérique ──
  productType: ProductType
  /** Chemin dans le bucket privé — jamais une URL. */
  digitalFilePath: string | null
  digitalFileName: string | null
  digitalFileSize: number | null
}

export function buildInitialState(product?: ShopProduct): ProductFormState {
  return {
    name:           product?.name ?? '',
    slug:           product?.slug ?? '',
    subtitle:       product?.subtitle ?? '',
    description:    product?.description ?? '',
    nameEn:         product?.name_en ?? '',
    subtitleEn:     product?.subtitle_en ?? '',
    descriptionEn:  product?.description_en ?? '',
    priceEuros:     product ? String(product.price / 100) : '',
    salePriceEuros: product?.sale_price !== null && product?.sale_price !== undefined ? String(product.sale_price / 100) : '',
    images:         product?.images ?? [],
    stlUrl:         product?.stl_url ?? null,
    stock:          product?.stock !== null && product?.stock !== undefined ? String(product.stock) : '',
    weightGrams:    product ? String(product.weight_grams) : '',
    customFields:   product?.custom_fields ?? [],
    category:       product?.category ?? '',
    featured:       product?.featured ?? false,
    modelRotation:  product?.model_rotation ?? { x: 0, y: 0, z: 0 },
    active:         product?.active ?? true,
    productType:      product?.product_type ?? 'physical',
    digitalFilePath:  product?.digital_file_path ?? null,
    digitalFileName:  product?.digital_file_name ?? null,
    digitalFileSize:  product?.digital_file_size ?? null,
  }
}

export function parseEuros(value: string): number {
  return Math.round(parseFloat(value.replace(',', '.')) * 100)
}

/** Valide et convertit l'état du formulaire en payload API. */
export function buildProductPayload(f: ProductFormState):
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; error: string } {
  const price = parseEuros(f.priceEuros)
  if (isNaN(price) || price <= 0) return { ok: false, error: 'Prix invalide' }

  let salePrice: number | null = null
  if (f.salePriceEuros !== '') {
    salePrice = parseEuros(f.salePriceEuros)
    if (isNaN(salePrice) || salePrice <= 0) return { ok: false, error: 'Prix promotionnel invalide' }
    if (salePrice >= price) return { ok: false, error: 'Le prix promotionnel doit être inférieur au prix de base' }
  }

  const digital = f.productType === 'digital'

  // Même règle que la contrainte DB, mais avec un message utile : publier un
  // produit numérique sans fichier ferait payer un téléchargement inexistant.
  if (digital && f.active && !f.digitalFilePath)
    return { ok: false, error: 'Un produit numérique actif doit avoir un fichier à télécharger' }

  return {
    ok: true,
    payload: {
      name: f.name,
      slug: f.slug || (f.name ? generateSlug(f.name) : ''),
      subtitle: f.subtitle || null,
      description: f.description,
      name_en: f.nameEn || null,
      subtitle_en: f.subtitleEn || null,
      description_en: f.descriptionEn || null,
      price,
      sale_price: salePrice,
      images: f.images,
      stl_url: f.stlUrl,
      // Un fichier ne s'épuise pas et ne pèse rien : stock illimité et poids
      // neutre, pour que le calcul de port et le décrément de stock l'ignorent.
      stock: digital ? null : (f.stock !== '' ? parseInt(f.stock, 10) : null),
      weight_grams: digital ? 1 : (parseInt(f.weightGrams, 10) || 100),
      active: f.active,
      custom_fields: f.customFields,
      category: f.category || null,
      featured: f.featured,
      model_rotation: f.modelRotation,
      product_type: f.productType,
      digital_file_path: digital ? f.digitalFilePath : null,
      digital_file_name: digital ? f.digitalFileName : null,
      digital_file_size: digital ? f.digitalFileSize : null,
    },
  }
}

// Styles partagés des sections du formulaire
export const inputClass = 'w-full rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-2.5 text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none focus:border-amber transition-colors'
export const labelClass = 'block text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1.5'
