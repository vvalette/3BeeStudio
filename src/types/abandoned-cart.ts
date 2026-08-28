import type { ShopOrderItem } from './shop-order'

/**
 * Instantané d'un panier laissé au paiement, pris au moment où la session Stripe
 * expire et où la commande fantôme est supprimée (cf. `snapshotAbandonedCart`).
 *
 * Les lignes reprennent la forme de `shop_orders.items` : mêmes noms, mêmes
 * prix figés. Ils servent à écrire l'email ; la restauration du panier, elle,
 * relit les prix courants (cf. `/api/boutique/cart/restore`).
 */
export interface AbandonedCart {
  id:         string
  created_at: string
  order_id:   string | null
  /** Secret du lien de restauration. Ne jamais l'exposer ailleurs que dans l'email. */
  token:      string
  email:      string
  name:       string | null
  locale:     string
  items:      ShopOrderItem[]
  subtotal:     number
  total_amount: number
  reminded_at:  string | null
  recovered_at: string | null
}

/** Fenêtre de relance, en heures depuis l'abandon. */
export const REMINDER_MIN_HOURS = 1
/**
 * Au-delà, on ne relance plus : un panier de plus de deux jours n'a plus rien
 * d'un achat en cours, et l'email devient de la prospection.
 */
export const REMINDER_MAX_HOURS = 48

/** Nombre maximum de relances envoyées par passage du cron. */
export const REMINDER_BATCH_SIZE = 50
