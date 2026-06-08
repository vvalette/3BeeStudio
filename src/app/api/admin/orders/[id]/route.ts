import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { z } from 'zod'
import type { OrderStatus } from '@/types/order'

async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  return token === process.env.ADMIN_PASSWORD
}

const VALID_STATUSES: OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'processing',
  'printing',
  'shipped',
  'delivered',
]

const schema = z.object({
  status: z.enum(['pending_payment', 'confirmed', 'processing', 'printing', 'shipped', 'delivered']).optional(),
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

  const updates: Record<string, string> = {}
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

// Unused variable fix
void VALID_STATUSES
