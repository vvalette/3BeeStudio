import { supabaseAdmin } from '@/lib/supabase'
import { sendShopOrderConfirmation, sendShopOrderAdminNotification } from '@/lib/resend'
import { sendCriticalAlert } from '@/lib/alert'
import { revalidateShop } from '@/lib/revalidate'
import { grantDownloads } from '@/lib/digital-delivery'
import type { ShopOrder } from '@/types/shop-order'

/**
 * Confirme une commande boutique payée : statut, décrément de stock, revalidation
 * ISR, email de confirmation. Partagé entre le webhook Stripe et le fallback sync
 * de la page de suivi — les deux peuvent gagner la course, les effets de bord
 * (stock, email) doivent partir avec le gagnant, une seule fois.
 *
 * Idempotent : le `.eq('status','pending_payment')` garantit qu'un seul appel
 * effectue la transition (rejeu webhook, double onglet, webhook + sync).
 *
 * Retour :
 *  - { order }  → confirmation effectuée par CET appel (avec la ligne à jour)
 *  - {}         → déjà confirmée ailleurs (rejeu) — rien à faire
 *  - { error }  → échec d'update DB : le webhook doit renvoyer 500 pour que Stripe retente
 */
export async function confirmShopOrder(
  shopOrderId: string,
): Promise<{ order?: ShopOrder; error?: true }> {
  // maybeSingle (et non single) : sur un rejeu, le filtre status ne matche plus aucune
  // ligne — single() renverrait une erreur PGRST116 → 500 → Stripe retenterait en boucle.
  const { data: updatedShop, error } = await supabaseAdmin
    .from('shop_orders')
    .update({ status: 'confirmed' })
    .eq('id', shopOrderId)
    .eq('status', 'pending_payment')
    .select()
    .maybeSingle()

  if (error) {
    console.error('[confirm-shop-order] Erreur shop_orders update:', error)
    await sendCriticalAlert('Webhook Stripe — échec confirmation commande boutique', {
      shopOrderId,
      erreur: error.message,
      consequence: 'Commande payée potentiellement bloquée en pending_payment',
    })
    return { error: true }
  }
  if (!updatedShop) return {} // déjà confirmée (rejeu idempotent)

  console.info('[confirm-shop-order]', JSON.stringify({ event: 'shop_order_confirmed', shopOrderId }))

  let shopOrder = updatedShop as ShopOrder

  // Commande repartie d'une relance de panier : on ferme le panier d'origine.
  // C'est la seule mesure honnête du chiffre récupéré — sans ce marquage, un
  // client revenu grâce à l'email est indiscernable d'un client revenu seul.
  // Non bloquant : une attribution manquée ne doit pas retenir une commande payée.
  if (shopOrder.recovery_token) {
    const { error: recoverError } = await supabaseAdmin
      .from('abandoned_carts')
      .update({ recovered_at: new Date().toISOString() })
      .eq('token', shopOrder.recovery_token)
      .is('recovered_at', null)
    if (recoverError) console.error('[confirm-shop-order] Attribution relance échouée:', recoverError.message)
    else console.info('[confirm-shop-order]', JSON.stringify({ event: 'cart_recovered', shopOrderId }))
  }

  // Ouvre les droits de téléchargement AVANT les emails : la confirmation contient
  // les liens, ils doivent exister au moment où elle part.
  // Idempotent (index unique order_id/product_id) — un rejeu ne remet pas les
  // compteurs à zéro ni ne repousse l'expiration.
  if (shopOrder.has_digital) {
    const granted = await grantDownloads(shopOrder)

    // Une commande 100 % fichiers est terminée à la seconde où le paiement passe :
    // les liens sont ouverts, il n'y a ni colis à préparer ni étiquette à générer.
    // La laisser en `confirmed` la ferait apparaître à vie dans les files « à faire »
    // de l'admin pour un travail qui n'existe pas.
    //
    // Conditionné au grant réel : zéro fichier débloqué = anomalie (produit sans
    // fichier), et la commande doit alors rester visible comme non traitée.
    if (granted > 0 && !shopOrder.has_physical) {
      const { error: deliverError } = await supabaseAdmin
        .from('shop_orders')
        .update({ status: 'delivered' })
        .eq('id', shopOrderId)

      if (deliverError) {
        // Non bloquant : le client a ses fichiers, seule l'étiquette de statut
        // côté admin reste à jour manuellement.
        console.error('[confirm-shop-order] Passage en delivered échoué:', deliverError)
      } else {
        // Copie plutôt que mutation : la ligne renvoyée par Supabase est aussi
        // celle que l'appelant reçoit, on ne la modifie pas sous ses pieds.
        shopOrder = { ...shopOrder, status: 'delivered' }
      }
    }
  }

  for (const item of shopOrder.items ?? []) {
    // Un fichier ne se consomme pas : décrémenter son stock déclencherait une
    // fausse alerte de survente au deuxième acheteur.
    if (item.is_digital) continue

    const { data: stockRows, error: rpcErr } = await supabaseAdmin
      .rpc('decrement_shop_stock', { p_product_id: item.product_id, p_qty: item.quantity })
    if (rpcErr) {
      console.error('[confirm-shop-order] Erreur décrément stock:', item.product_id, rpcErr)
      continue
    }
    // Depuis la migration 028, la RPC retourne { new_stock, oversold } — avant elle
    // retournait void (data null) : on tolère les deux formes.
    const stockRow = (Array.isArray(stockRows) ? stockRows[0] : null) as
      | { new_stock: number; oversold: boolean }
      | null
    if (stockRow?.oversold) {
      console.error('[confirm-shop-order] SURVENTE:', JSON.stringify({ shopOrderId, productId: item.product_id, demande: item.quantity }))
      await sendCriticalAlert('Survente de stock — commande payée sans stock suffisant', {
        shopOrderId,
        produit: item.product_name,
        productId: item.product_id,
        quantiteCommandee: item.quantity,
        stockRestant: stockRow.new_stock,
        action: 'Contacter le client : relancer une impression ou rembourser',
      })
    }
  }

  // Revalide les pages publiques pour refléter le nouveau stock
  // (ISR long = pas de régénération auto avant 1h sans ça).
  const productIds = (shopOrder.items ?? []).map((i) => i.product_id)
  if (productIds.length > 0) {
    const { data: rows } = await supabaseAdmin
      .from('shop_products')
      .select('slug')
      .in('id', productIds)
    try {
      revalidateShop(...(rows ?? []).map((r) => (r as { slug: string }).slug))
    } catch (err) {
      // revalidatePath est interdit pendant le rendu d'une page (cas du fallback
      // sync de la page suivi) — l'ISR se rafraîchira seul au plus tard dans l'heure.
      console.warn('[confirm-shop-order] Revalidation ignorée (contexte rendu):', err)
    }
  }

  await Promise.all([
    sendShopOrderConfirmation(shopOrder).catch((err) =>
      console.error('[confirm-shop-order] Email client non bloquant:', err),
    ),
    sendShopOrderAdminNotification(shopOrder).catch((err) =>
      console.error('[confirm-shop-order] Notif admin non bloquante:', err),
    ),
  ])

  return { order: shopOrder }
}
