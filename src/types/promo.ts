export type PromoType = 'percent' | 'amount' | 'free_shipping'

/** Sur quelle part du panier la remise s'applique. */
export type PromoScope = 'all' | 'physical' | 'digital'

export interface PromoCode {
  id:         string
  created_at: string
  updated_at: string

  code:  string
  type:  PromoType
  /** percent → 1 à 100 · amount → centimes · free_shipping → ignoré. */
  value: number

  active:    boolean
  starts_at: string | null
  ends_at:   string | null

  /** null = illimité. */
  max_uses: number | null
  uses:     number

  once_per_email: boolean
  min_subtotal:   number
  applies_to:     PromoScope
  note:           string | null
}

/** Raison de refus, renvoyée telle quelle au client qui la traduit. */
export type PromoRejection =
  | 'introuvable'
  | 'inactif'
  | 'pas_encore'
  | 'expire'
  | 'epuise'
  | 'deja_utilise'
  | 'minimum'
  | 'panier_incompatible'
  | 'rien_a_livrer'
