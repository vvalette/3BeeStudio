/**
 * Seuil « stock bas » partagé par l'admin boutique (badge orange sur la fiche
 * produit) et l'alerte de réapprovisionnement (/api/cron/low-stock).
 *
 * 3 unités : en impression 3D à la demande, une pièce prend quelques heures à
 * réimprimer — en dessous de 3 on risque la rupture avant d'avoir relancé un lot.
 */
export const LOW_STOCK_THRESHOLD = 3

/** `null` = stock illimité (pièce imprimée à la commande) → jamais en alerte. */
export function isLowStock(stock: number | null): boolean {
  return stock !== null && stock <= LOW_STOCK_THRESHOLD
}

export function isOutOfStock(stock: number | null): boolean {
  return stock !== null && stock === 0
}
