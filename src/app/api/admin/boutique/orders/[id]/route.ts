import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { refundAndCancelShipment } from '@/lib/cancel-order'
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

  const updates: Record<string, unknown> = {}
  const d = parsed.data
  if (d.status !== undefined)          updates.status          = d.status
  if (d.tracking_number !== undefined) updates.tracking_number = d.tracking_number
  if (d.tracking_url !== undefined)    updates.tracking_url    = d.tracking_url
  if (d.admin_notes !== undefined)     updates.admin_notes     = d.admin_notes

  const { data, error } = await supabaseAdmin
    .from('shop_orders').update(updates).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
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

  // Remboursement Stripe + annulation Boxtal avant suppression (best-effort).
  // Les erreurs Stripe bloquent la suppression ; les erreurs Boxtal sont ignorées.
  if (order.status !== 'pending_payment' && order.status !== 'delivered' && order.status !== 'cancelled') {
    await refundAndCancelShipment(order)
  }

  const { error } = await supabaseAdmin.from('shop_orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
