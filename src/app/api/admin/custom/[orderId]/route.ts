import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { z } from 'zod'
import type { CustomOrderStatus } from '@/types/custom-order'

const CUSTOM_STATUSES: CustomOrderStatus[] = [
  'pending_quote', 'quote_sent', 'deposit_paid', 'in_production', 'shipped', 'delivered', 'cancelled',
]

const patchSchema = z.object({
  status:          z.enum(CUSTOM_STATUSES as [CustomOrderStatus, ...CustomOrderStatus[]]).optional(),
  admin_notes:     z.string().optional(),
  tracking_number: z.string().optional(),
  tracking_url:    z.string().optional(),
  deposit_amount:  z.number().int().positive().optional(),
  total_amount:    z.number().int().positive().optional(),
})

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const { orderId } = await params
  const { error } = await supabaseAdmin.from('custom_orders').delete().eq('id', orderId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { orderId } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('custom_orders')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
