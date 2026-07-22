import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { TablesUpdate } from '@/types/database'
import { isAuthenticated } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  status: z.enum(['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
  tracking_number: z.string().optional(),
  admin_notes: z.string().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const updates: TablesUpdate<'orders'> = {}
  if (parsed.data.status) updates.status = parsed.data.status
  if (parsed.data.tracking_number !== undefined) updates.tracking_number = parsed.data.tracking_number
  if (parsed.data.admin_notes !== undefined) updates.admin_notes = parsed.data.admin_notes

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const { id } = await params
  const { error } = await supabaseAdmin.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  return NextResponse.json(data)
}
