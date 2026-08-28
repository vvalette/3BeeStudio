import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import type { ShopOrder } from '@/types/shop-order'

/**
 * Panier abandonné : instantané, lien de restauration, opposition.
 *
 * Le point de collecte est le webhook Stripe `checkout.session.expired`, qui
 * supprime la commande restée en `pending_payment` 30 minutes après sa création.
 * C'est le dernier moment où le panier existe encore quelque part : ni le
 * localStorage du client (il peut être sur un autre appareil), ni Stripe (la
 * session expirée ne rejoue pas les lignes) ne permettent de le reconstituer
 * ensuite.
 */

/** 32 octets en base64url : assez pour qu'un lien de restauration ne se devine pas. */
function newToken(): string {
  return randomBytes(24).toString('base64url')
}

/**
 * Copie le panier d'une commande abandonnée dans `abandoned_carts`, avant que le
 * webhook ne supprime la commande.
 *
 * Ne lève jamais : un échec ici ne doit pas faire répondre 500 au webhook Stripe,
 * qui rejouerait l'événement en boucle pour une relance marketing manquée.
 * Retourne le jeton créé (ou `null` si rien n'a été enregistré).
 */
export async function snapshotAbandonedCart(shopOrderId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('shop_orders')
      .select('id, email, name, locale, items, subtotal, total_amount, status')
      .eq('id', shopOrderId)
      .maybeSingle()

    if (error || !data) return null

    const order = data as unknown as ShopOrder
    // Seule une commande jamais payée est un panier abandonné. Le filtre paraît
    // redondant avec l'événement Stripe, mais un rejeu tardif de
    // `checkout.session.expired` peut arriver après qu'une seconde tentative a
    // abouti : sans lui, on relancerait un client qui vient d'acheter.
    if (order.status !== 'pending_payment') return null
    if (!Array.isArray(order.items) || order.items.length === 0) return null

    // Opposition déjà exprimée : on n'enregistre même pas le panier, il ne
    // servirait à aucune finalité.
    const { data: optout } = await supabaseAdmin
      .from('abandoned_cart_optouts')
      .select('email')
      .eq('email', order.email)
      .maybeSingle()
    if (optout) return null

    const token = newToken()
    const { error: insertError } = await supabaseAdmin.from('abandoned_carts').insert({
      order_id:     order.id,
      token,
      email:        order.email,
      name:         order.name,
      locale:       order.locale ?? 'fr',
      items:        order.items,
      subtotal:     order.subtotal,
      total_amount: order.total_amount,
    })

    if (insertError) {
      console.error('[abandoned-cart] instantané impossible:', insertError.message)
      return null
    }

    console.info('[abandoned-cart]', JSON.stringify({ event: 'snapshot', shopOrderId, lignes: order.items.length }))
    return token
  } catch (err) {
    console.error('[abandoned-cart] instantané impossible:', err instanceof Error ? err.message : String(err))
    return null
  }
}

/** Lien de reprise du panier, envoyé dans l'email de relance. */
export function recoveryUrl(appUrl: string, token: string, locale: string): string {
  const prefix = locale === 'en' ? '/en' : ''
  return `${appUrl}${prefix}/boutique/commande?panier=${encodeURIComponent(token)}`
}

/** Lien de désinscription des relances, obligatoire dans l'email. */
export function optOutUrl(appUrl: string, token: string): string {
  return `${appUrl}/api/boutique/cart/opt-out?token=${encodeURIComponent(token)}`
}
