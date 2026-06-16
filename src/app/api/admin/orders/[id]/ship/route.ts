import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { createBoxtalShipment, getBoxtalLabel } from '@/lib/boxtal'
import type { Order } from '@/types/order'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  const { data: order, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  if (!order.shipping_address || !order.shipping_city || !order.shipping_postal_code) {
    return NextResponse.json({ error: 'Adresse de livraison incomplète' }, { status: 400 })
  }

  try {
    // Commande Boxtal déjà créée → re-télécharge l'étiquette (URL signée qui expire)
    if (order.boxtal_order_id) {
      const labelUrl = await getBoxtalLabel(order.boxtal_order_id as string)
      return NextResponse.json({ label_url: labelUrl, boxtal_order_id: order.boxtal_order_id })
    }

    // Créer la commande Boxtal
    const { boxtalOrderId, labelUrl } = await createBoxtalShipment(order as Order)

    // Sauvegarder l'ID Boxtal — le statut passe à "expédié" via webhook Boxtal quand le transporteur prend en charge
    await supabaseAdmin
      .from('orders')
      .update({ boxtal_order_id: boxtalOrderId })
      .eq('id', id)

    return NextResponse.json({ label_url: labelUrl, boxtal_order_id: boxtalOrderId })
  } catch (e) {
    console.error('[boxtal] erreur expédition:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur Boxtal' },
      { status: 500 }
    )
  }
}
