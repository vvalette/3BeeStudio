import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { TablesUpdate } from '@/types/database'
import { isAuthenticated } from '@/lib/auth'
import { refundAndCancelShipment } from '@/lib/cancel-order'
import { notifyShipmentIfNewlyShipped } from '@/lib/notify-shipment'
import { z } from 'zod'
import type { ShopOrder } from '@/types/shop-order'

const patchSchema = z.object({
  status:          z.enum(['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered']).optional(),
  tracking_number: z.string().nullable().optional(),
  tracking_url:    z.string().url().nullable().optional(),
  admin_notes:     z.string().nullable().optional(),
})

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const updates: TablesUpdate<'shop_orders'> = {}
  const d = parsed.data
  if (d.status !== undefined)          updates.status          = d.status
  if (d.tracking_number !== undefined) updates.tracking_number = d.tracking_number
  if (d.tracking_url !== undefined)    updates.tracking_url    = d.tracking_url
  if (d.admin_notes !== undefined)     updates.admin_notes     = d.admin_notes

  // Statut d'avant l'update : sert à n'envoyer l'email d'expédition que sur la
  // vraie transition (voir notifyShipmentIfNewlyShipped).
  const { data: before } = await supabaseAdmin
    .from('shop_orders').select('status').eq('id', id).single()

  const { data, error } = await supabaseAdmin
    .from('shop_orders').update(updates).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const order = data as ShopOrder
  const notified = before
    ? await notifyShipmentIfNewlyShipped('shop', before.status as ShopOrder['status'], order)
    : false

  return NextResponse.json({ ...order, shipment_email_sent: notified })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  const { data: raw, error: fetchError } = await supabaseAdmin
    .from('shop_orders').select('*').eq('id', id).single()

  if (fetchError || !raw)
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  const order = raw as ShopOrder

  // Remboursement Stripe + annulation Boxtal avant suppression.
  // Les erreurs Stripe bloquent la suppression (on ne supprime pas une commande
  // encaissée sans avoir remboursé) ; les erreurs Boxtal sont ignorées. Un paiement
  // déjà remboursé à la main dans Stripe n'est pas une erreur : la suppression passe.
  if (order.status !== 'pending_payment' && order.status !== 'delivered' && order.status !== 'cancelled') {
    try {
      await refundAndCancelShipment(order)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error('[delete] Remboursement Stripe impossible:', message)
      return NextResponse.json(
        { error: `Remboursement Stripe impossible, commande non supprimée : ${message}` },
        { status: 502 }
      )
    }
  }

  const { error } = await supabaseAdmin.from('shop_orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
