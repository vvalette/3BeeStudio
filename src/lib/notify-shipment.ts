import { sendNfcShipmentNotification, sendShopShipmentNotification } from '@/lib/resend'
import type { Order, OrderStatus } from '@/types/order'
import type { ShopOrder, ShopOrderStatus } from '@/types/shop-order'

/**
 * Envoie l'email « commande expédiée » quand — et seulement quand — l'admin fait
 * réellement basculer la commande en `shipped`. Repasser sur le bouton déjà actif
 * ou sauvegarder un numéro de suivi ne doit pas renvoyer de mail au client.
 *
 * L'autre point d'envoi est le webhook Boxtal, qui porte sa propre idempotence via
 * la garde `.in('status', ['confirmed','processing'])` de son update.
 *
 * Jamais bloquant : un échec Resend ne doit pas faire échouer la sauvegarde admin,
 * sinon l'admin re-clique et la commande part deux fois en base.
 */
export async function notifyShipmentIfNewlyShipped(
  kind: 'nfc',
  previousStatus: OrderStatus,
  order: Order,
): Promise<boolean>
export async function notifyShipmentIfNewlyShipped(
  kind: 'shop',
  previousStatus: ShopOrderStatus,
  order: ShopOrder,
): Promise<boolean>
export async function notifyShipmentIfNewlyShipped(
  kind: 'nfc' | 'shop',
  previousStatus: string,
  order: Order | ShopOrder,
): Promise<boolean> {
  if (order.status !== 'shipped' || previousStatus === 'shipped') return false

  try {
    if (kind === 'nfc') await sendNfcShipmentNotification(order as Order)
    else                await sendShopShipmentNotification(order as ShopOrder)
    return true
  } catch (err) {
    console.error(`[notify-shipment] email ${kind} non bloquant:`, err)
    return false
  }
}
