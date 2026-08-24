import type { PromoCode, PromoRejection } from '@/types/promo'

/**
 * Règles des codes promo — module pur, sans accès base ni Stripe.
 *
 * Il est appelé à trois endroits qui doivent donner le MÊME résultat :
 * l'aperçu au checkout (`/api/boutique/promo`), le calcul qui part chez Stripe
 * (`/api/boutique/checkout`), et les tests. Le client n'envoie jamais un montant
 * de remise — il envoie un code, le serveur recalcule.
 *
 * La consommation (plafond d'usages, une fois par email) vit en SQL dans
 * `redeem_promo_code` : seule la base peut décider ça sans course entre deux
 * paiements simultanés.
 */

export interface CartAmounts {
  subtotal:         number
  physicalSubtotal: number
  digitalSubtotal:  number
  hasPhysical:      boolean
}

export type PromoOutcome =
  | { ok: false; reason: PromoRejection }
  | { ok: true; discount: number; freeShipping: boolean }

/** Part du panier sur laquelle porte la remise. */
export function promoBase(promo: PromoCode, cart: CartAmounts): number {
  switch (promo.applies_to) {
    case 'physical': return cart.physicalSubtotal
    case 'digital':  return cart.digitalSubtotal
    default:         return cart.subtotal
  }
}

/**
 * Valide un code contre un panier à un instant donné.
 *
 * Ne vérifie PAS « déjà utilisé par cet email » : cette question demande la base
 * (cf. `redeem_promo_code`). Tout le reste est décidé ici.
 */
export function checkPromo(
  promo: PromoCode | null | undefined,
  cart: CartAmounts,
  now: Date = new Date(),
): PromoOutcome {
  if (!promo)        return { ok: false, reason: 'introuvable' }
  if (!promo.active) return { ok: false, reason: 'inactif' }

  if (promo.starts_at && now < new Date(promo.starts_at)) return { ok: false, reason: 'pas_encore' }
  if (promo.ends_at   && now > new Date(promo.ends_at))   return { ok: false, reason: 'expire' }

  if (promo.max_uses !== null && promo.uses >= promo.max_uses) return { ok: false, reason: 'epuise' }

  // Le minimum porte sur le panier entier, pas sur la part ciblée : c'est ainsi
  // que le client le comprend (« à partir de 30 € d'achat »).
  if (cart.subtotal < promo.min_subtotal) return { ok: false, reason: 'minimum' }

  if (promo.type === 'free_shipping') {
    // Un panier 100 % fichiers n'a pas de port : offrir la livraison n'aurait
    // aucun effet, autant le dire au lieu d'afficher une remise de 0 €.
    if (!cart.hasPhysical) return { ok: false, reason: 'rien_a_livrer' }
    return { ok: true, discount: 0, freeShipping: true }
  }

  const base = promoBase(promo, cart)
  // Code réservé aux objets sur un panier de fichiers (ou l'inverse) : rien à remiser.
  if (base <= 0) return { ok: false, reason: 'panier_incompatible' }

  const discount = promo.type === 'percent'
    ? Math.round((base * promo.value) / 100)
    // Une remise fixe supérieure à la part concernée ne doit jamais rendre de
    // l'argent : elle est plafonnée à cette part.
    : Math.min(promo.value, base)

  return { ok: true, discount, freeShipping: false }
}

/**
 * Un code en pourcentage ou en montant remplace la réduction newsletter au lieu
 * de s'y ajouter : deux remises sur le même sous-total, ce n'est jamais ce qu'on
 * a voulu offrir. La newsletter n'est alors PAS consommée — le client la garde
 * pour une prochaine commande.
 *
 * « Livraison offerte » est le seul type cumulable : il porte sur le port, pas
 * sur le sous-total.
 */
export function promoReplacesNewsletter(promo: PromoCode): boolean {
  return promo.type !== 'free_shipping'
}

/** Libellé court d'un code, pour l'admin et les récapitulatifs. */
export function promoLabel(promo: Pick<PromoCode, 'type' | 'value'>): string {
  switch (promo.type) {
    case 'percent':       return `−${promo.value} %`
    case 'amount':        return `−${(promo.value / 100).toFixed(2).replace('.', ',')} €`
    case 'free_shipping': return 'Livraison offerte'
  }
}

/** Normalise la saisie : les codes sont stockés en majuscules, sans espaces. */
export function normalizeCode(input: string): string {
  return input.trim().toUpperCase()
}

/** Un code épuisé, expiré ou désactivé ne sert plus à rien : l'admin doit le voir. */
export function promoIsSpent(promo: PromoCode, now: Date = new Date()): boolean {
  if (!promo.active) return true
  if (promo.ends_at && now > new Date(promo.ends_at)) return true
  if (promo.max_uses !== null && promo.uses >= promo.max_uses) return true
  return false
}

/**
 * Libellé de la ligne de remise sur une commande.
 *
 * `discount_amount` est partagé entre la remise newsletter et les codes promo :
 * sans ce test, une commande remisée par un code afficherait « Réduction
 * newsletter » — y compris sur la facture, qui est un document comptable.
 */
export function discountLabel(
  order: { promo_code?: string | null },
  fallback = 'Réduction newsletter',
): string {
  return order.promo_code ? `Code ${order.promo_code}` : fallback
}
