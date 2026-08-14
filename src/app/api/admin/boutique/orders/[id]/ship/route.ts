import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { createShopBoxtalShipment, getBoxtalLabel, getBoxtalShippingCost } from '@/lib/boxtal'
import type { ShopOrder } from '@/types/shop-order'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await isAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id } = await params

  const { data: order, error: fetchError } = await supabaseAdmin
    .from('shop_orders')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  const shopOrder = order as ShopOrder

  if (shopOrder.delivery_mode === 'pickup') {
    return NextResponse.json({ error: 'Commande en retrait studio — pas d\'expédition' }, { status: 400 })
  }

  // Sans cette garde l'appel échouait plus bas sur « Adresse de livraison
  // incomplète », un message qui laisse croire à une donnée manquante alors
  // qu'une vente de fichiers n'a tout simplement pas de colis.
  if (shopOrder.delivery_mode === 'digital') {
    return NextResponse.json({ error: 'Commande de fichiers — rien à expédier' }, { status: 400 })
  }

  // Le relais exige un pickupPointCode : sans lui, Boxtal refuse l'expédition.
  if (shopOrder.delivery_mode === 'relay' && !shopOrder.pickup_point_code) {
    return NextResponse.json(
      { error: 'Point relais manquant sur cette commande — impossible de générer l\'étiquette' },
      { status: 400 },
    )
  }

  if (!shopOrder.shipping_address || !shopOrder.shipping_city || !shopOrder.shipping_postal_code) {
    return NextResponse.json({ error: 'Adresse de livraison incomplète' }, { status: 400 })
  }

  if (!shopOrder.phone) {
    return NextResponse.json({ error: 'Numéro de téléphone manquant' }, { status: 400 })
  }

  try {
    // Commande Boxtal déjà créée → re-télécharge l'étiquette (URL signée qui expire)
    if (shopOrder.boxtal_order_id) {
      const labelUrl = await getBoxtalLabel(shopOrder.boxtal_order_id)
      return NextResponse.json({ label_url: labelUrl, boxtal_order_id: shopOrder.boxtal_order_id })
    }

    const { boxtalOrderId, labelUrl } = await createShopBoxtalShipment(shopOrder)

    // L'API v3 n'a aucun endpoint de devis : le coût n'est connu qu'ici,
    // une fois l'expédition créée. Best-effort, ne bloque pas l'étiquette.
    const shippingCost = await getBoxtalShippingCost(boxtalOrderId)

    // Le statut passe à "shipped" via webhook Boxtal quand le transporteur prend en charge
    await supabaseAdmin
      .from('shop_orders')
      .update({ boxtal_order_id: boxtalOrderId, ...(shippingCost !== null ? { shipping_cost: shippingCost } : {}) })
      .eq('id', id)

    return NextResponse.json({ label_url: labelUrl, boxtal_order_id: boxtalOrderId, shipping_cost: shippingCost })
  } catch (e) {
    console.error('[boxtal-shop] erreur expédition:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Erreur Boxtal' },
      { status: 500 }
    )
  }
}
