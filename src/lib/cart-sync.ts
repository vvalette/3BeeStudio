import type { CartItem } from '@/types/cart'
import type { ProductColor, ProductType } from '@/types/shop-product'
import { effectivePrice, findProductColor } from '@/types/shop-product'

/**
 * Resynchronisation d'un panier resté en localStorage.
 *
 * Une ligne de panier fige le prix, le nom et le stock au moment de l'ajout, et
 * y reste jusqu'à ce que le client la retire. Un panier vieux de plusieurs
 * semaines annonce donc l'ancien prix — dans le tiroir ET dans le récapitulatif
 * du checkout, qui reprend `item.price` tel quel — alors que
 * `/api/boutique/checkout` relit les prix en base : le client voyait 0,40 € et
 * partait payer 0,50 € chez Stripe.
 *
 * Ce module est pur (pas d'accès base) : la lecture vit dans
 * `/api/boutique/cart/sync`, appelée par le CartProvider après hydratation.
 */

/** Produit tel que renvoyé par `/api/boutique/cart/sync` (produits actifs uniquement). */
export interface CartSyncProduct {
  id:           string
  name:         string
  slug:         string
  price:        number
  sale_price:   number | null
  images:       string[]
  stock:        number | null
  product_type: ProductType
  colors:       ProductColor[] | null
}

/**
 * Réaligne les lignes du panier sur l'état réel des produits.
 *
 * Une ligne est retirée quand le produit ne peut plus être acheté : désactivé,
 * supprimé, ou en rupture. Le checkout la refuserait de toute façon (404 ou
 * 409) et bloquerait le panier entier, y compris les articles disponibles.
 *
 * Retourne le tableau d'origine si rien n'a bougé : le cas courant ne doit ni
 * réécrire le localStorage, ni provoquer un rendu.
 */
export function reconcileCart(items: CartItem[], products: CartSyncProduct[]): CartItem[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  let changed = false

  const next: CartItem[] = []
  for (const item of items) {
    const p = byId.get(item.product_id)
    // Produit disparu (inactif ou supprimé) ou en rupture : la ligne saute.
    if (!p || p.stock === 0) {
      changed = true
      continue
    }

    const price    = effectivePrice(p)
    const original = p.sale_price !== null ? p.price : null
    const image    = p.images[0] ?? null
    const digital  = p.product_type === 'digital'
    const quantity = Math.max(1, Math.min(item.quantity, p.stock ?? 99))

    // Le coloris reste celui choisi par le client : seuls son libellé et sa
    // pastille suivent la palette, qui a pu être renommée depuis. Une clé qui
    // n'existe plus est laissée en l'état — c'est le checkout qui tranche, avec
    // un message qui renvoie le client sur la fiche produit.
    const color = item.color
      ? findProductColor(p.colors, item.color.key) ?? null
      : null

    const line: CartItem = {
      ...item,
      name:           p.name,
      slug:           p.slug,
      price,
      original_price: original,
      image,
      quantity,
      max_stock:      p.stock,
      ...(digital ? { is_digital: true } : {}),
      ...(color ? { color: { key: color.key, label: color.label, hex: color.hex } } : {}),
    }
    if (!digital && line.is_digital) delete line.is_digital

    if (
      line.name !== item.name ||
      line.slug !== item.slug ||
      line.price !== item.price ||
      line.original_price !== item.original_price ||
      line.image !== item.image ||
      line.quantity !== item.quantity ||
      line.max_stock !== item.max_stock ||
      !!line.is_digital !== !!item.is_digital ||
      line.color?.label !== item.color?.label ||
      line.color?.hex !== item.color?.hex
    ) changed = true

    next.push(line)
  }

  return changed ? next : items
}
