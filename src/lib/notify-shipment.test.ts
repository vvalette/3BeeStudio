import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Order } from '@/types/order'
import type { ShopOrder } from '@/types/shop-order'

const { sendShop, sendNfc } = vi.hoisted(() => ({
  sendShop: vi.fn(),
  sendNfc: vi.fn(),
}))

vi.mock('@/lib/resend', () => ({
  sendShopShipmentNotification: sendShop,
  sendNfcShipmentNotification: sendNfc,
}))

const { notifyShipmentIfNewlyShipped } = await import('./notify-shipment')

function shopOrder(status: ShopOrder['status']): ShopOrder {
  return { id: 'abc', status, name: 'Client', email: 'c@example.fr' } as ShopOrder
}

function nfcOrder(status: Order['status']): Order {
  return { id: 'def', status, company: 'ACME', email: 'c@example.fr' } as Order
}

beforeEach(() => {
  sendShop.mockReset().mockResolvedValue(undefined)
  sendNfc.mockReset().mockResolvedValue(undefined)
})

describe('notifyShipmentIfNewlyShipped', () => {
  it('envoie sur la transition vers expédiée', async () => {
    await expect(notifyShipmentIfNewlyShipped('shop', 'processing', shopOrder('shipped'))).resolves.toBe(true)
    expect(sendShop).toHaveBeenCalledOnce()
  })

  // Le cas qui compte : re-cliquer sur « Expédiée » ou sauvegarder un numéro de
  // suivi sur une commande déjà expédiée ne doit pas renvoyer de mail au client.
  it('n’envoie rien si la commande était déjà expédiée', async () => {
    await expect(notifyShipmentIfNewlyShipped('shop', 'shipped', shopOrder('shipped'))).resolves.toBe(false)
    expect(sendShop).not.toHaveBeenCalled()
  })

  it('n’envoie rien pour les autres statuts', async () => {
    for (const status of ['confirmed', 'processing', 'delivered', 'cancelled'] as const) {
      await expect(notifyShipmentIfNewlyShipped('shop', 'confirmed', shopOrder(status))).resolves.toBe(false)
    }
    expect(sendShop).not.toHaveBeenCalled()
  })

  it('route vers le bon flux', async () => {
    await notifyShipmentIfNewlyShipped('nfc', 'processing', nfcOrder('shipped'))
    expect(sendNfc).toHaveBeenCalledOnce()
    expect(sendShop).not.toHaveBeenCalled()
  })

  // Un échec Resend ne doit pas faire échouer la sauvegarde admin : sinon l'admin
  // re-clique et croit que le statut n'est pas passé alors qu'il l'est en base.
  it('avale les erreurs d’envoi', async () => {
    sendShop.mockRejectedValue(new Error('Resend down'))
    await expect(notifyShipmentIfNewlyShipped('shop', 'processing', shopOrder('shipped'))).resolves.toBe(false)
  })
})
