import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params

  const { data, error } = await supabaseAdmin
    .from('shop_orders')
    .select('id, created_at, status, items, subtotal, shipping, total_amount, name, email, shipping_name, shipping_city, shipping_postal_code, tracking_number, tracking_url')
    .eq('id', orderId)
    .single()

  if (error || !data)
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  return NextResponse.json(data)
}
