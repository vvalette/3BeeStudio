import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { refundAndCancelShipment } from '@/lib/cancel-order'
import type { ShopOrder } from '@/types/shop-order'

const NON_CANCELLABLE: ShopOrder['status'][] = ['shipped', 'delivered', 'cancelled']

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated())
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  const { data: raw, error: fetchError } = await supabaseAdmin
    .from('shop_orders').select('*').eq('id', id).single()

  if (fetchError || !raw)
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  const order = raw as ShopOrder

  if (NON_CANCELLABLE.includes(order.status))
    return NextResponse.json(
      { error: `Impossible d'annuler une commande au statut « ${order.status} »` },
      { status: 400 }
    )

  try {
    const result = await refundAndCancelShipment(order)
    await supabaseAdmin.from('shop_orders').update({ status: 'cancelled' }).eq('id', id)
    return NextResponse.json(result)
  } catch (e) {
    console.error('[cancel] Erreur:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
