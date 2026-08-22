/**
 * POST /api/admin/custom/[orderId]/ship
 * Crée l'étiquette Boxtal d'un projet sur-mesure, ou re-télécharge celle déjà
 * créée (l'URL Boxtal est signée et expire).
 *
 * Symétrique de la route boutique, à une différence près : le colis n'est pas
 * déduit de la commande mais déclaré par l'admin — une pièce unique n'a ni
 * fiche produit ni quantité dont tirer un poids.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { createCustomBoxtalShipment, getBoxtalLabel, getBoxtalShippingCost } from '@/lib/boxtal'
import type { CustomOrder } from '@/types/custom-order'

const schema = z.object({
  weight_grams: z.number().int().positive().max(30000),
  length_cm:    z.number().int().positive().max(200),
  width_cm:     z.number().int().positive().max(200),
  height_cm:    z.number().int().positive().max(200),
})

export async function POST(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { orderId } = await params

  const { data, error: fetchError } = await supabaseAdmin
    .from('custom_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (fetchError || !data) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  }

  const order = data as CustomOrder

  try {
    // Étiquette déjà créée → on ne redemande pas le colis, on re-signe l'URL.
    if (order.boxtal_order_id) {
      const labelUrl = await getBoxtalLabel(order.boxtal_order_id)
      return NextResponse.json({ label_url: labelUrl, boxtal_order_id: order.boxtal_order_id })
    }

    if (!order.shipping_address || !order.shipping_city || !order.shipping_postal_code) {
      return NextResponse.json({ error: 'Adresse de livraison incomplète' }, { status: 400 })
    }

    // Le téléphone peut être vide sur une demande saisie à la main : Boxtal
    // l'exige pour la prise en charge, autant le dire ici plutôt que de laisser
    // l'API renvoyer une erreur opaque.
    if (!order.phone) {
      return NextResponse.json(
        { error: 'Numéro de téléphone manquant — Boxtal l\'exige pour l\'expédition' },
        { status: 400 },
      )
    }

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Colis invalide — poids et dimensions requis', details: parsed.error.flatten() },
        { status: 422 },
      )
    }

    const { weight_grams, length_cm, width_cm, height_cm } = parsed.data

    const { boxtalOrderId, labelUrl } = await createCustomBoxtalShipment(order, {
      weight: Math.round(weight_grams) / 1000,
      length: length_cm,
      width:  width_cm,
      height: height_cm,
    })

    // L'API v3 n'a aucun endpoint de devis : le coût n'est connu qu'ici, une
    // fois l'expédition créée. Best-effort, ne bloque pas l'étiquette.
    const shippingCost = await getBoxtalShippingCost(boxtalOrderId)

    // Le passage en `shipped` vient du webhook Boxtal, à la prise en charge.
    const { error: updateError } = await supabaseAdmin
      .from('custom_orders')
      .update({
        boxtal_order_id:      boxtalOrderId,
        package_weight_grams: weight_grams,
        package_length_cm:    length_cm,
        package_width_cm:     width_cm,
        package_height_cm:    height_cm,
        ...(shippingCost !== null ? { shipping_cost: shippingCost } : {}),
        updated_at:           new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      // L'étiquette existe chez Boxtal : la perdre en base couperait le suivi.
      console.error('[boxtal-custom] expédition créée mais non enregistrée:', updateError, boxtalOrderId)
      return NextResponse.json({
        label_url: labelUrl,
        boxtal_order_id: boxtalOrderId,
        warning: `Étiquette créée (${boxtalOrderId}) mais non enregistrée en base — notez cet identifiant.`,
      })
    }

    return NextResponse.json({
      label_url: labelUrl,
      boxtal_order_id: boxtalOrderId,
      shipping_cost: shippingCost,
    })
  } catch (e) {
    console.error('[boxtal-custom] erreur expédition:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur Boxtal' }, { status: 500 })
  }
}
