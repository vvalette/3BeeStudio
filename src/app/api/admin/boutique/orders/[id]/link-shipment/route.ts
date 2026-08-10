import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import type { TablesUpdate } from '@/types/database'
import { isAuthenticated } from '@/lib/auth'
import { getBoxtalShipment, getBoxtalTracking } from '@/lib/boxtal'
import type { ShopOrder, ShopOrderStatus } from '@/types/shop-order'

const bodySchema = z.object({
  boxtal_order_id: z.string().trim().min(1, 'Identifiant requis'),
})

/**
 * Rattache une expédition créée à la main dans le back-office Boxtal à une
 * commande boutique. Sans ce lien, le webhook Boxtal (qui matche sur
 * boxtal_order_id) ne peut rien mettre à jour et l'étiquette n'est pas
 * re-téléchargeable depuis l'admin.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  const parsed = bodySchema.safeParse(await req.json())
  if (!parsed.success)
    return NextResponse.json({ error: 'Identifiant Boxtal manquant' }, { status: 400 })

  const boxtalOrderId = parsed.data.boxtal_order_id

  const { data: raw, error: fetchError } = await supabaseAdmin
    .from('shop_orders').select('*').eq('id', id).single()

  if (fetchError || !raw)
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  const order = raw as ShopOrder

  if (order.delivery_mode === 'pickup')
    return NextResponse.json({ error: 'Commande en retrait studio — pas d\'expédition' }, { status: 400 })

  // Le webhook met à jour toutes les lignes portant ce boxtal_order_id, sur les
  // deux tables : un doublon ferait basculer deux commandes d'un coup.
  for (const table of ['orders', 'shop_orders'] as const) {
    const { data: clash } = await supabaseAdmin
      .from(table).select('id').eq('boxtal_order_id', boxtalOrderId).neq('id', id).limit(1)
    if (clash?.length)
      return NextResponse.json(
        { error: `Cette expédition est déjà rattachée à une autre commande (${clash[0].id.slice(0, 8).toUpperCase()})` },
        { status: 409 },
      )
  }

  // Valide l'identifiant auprès de Boxtal avant de l'enregistrer : un id erroné
  // casserait silencieusement le suivi et l'annulation.
  let shippingCost: number | null = null
  try {
    ({ shippingCost } = await getBoxtalShipment(boxtalOrderId))
  } catch (e) {
    console.error('[boxtal-link] expédition introuvable:', e)
    return NextResponse.json(
      { error: 'Expédition introuvable chez Boxtal — vérifiez l\'identifiant' },
      { status: 404 },
    )
  }

  const updates: TablesUpdate<'shop_orders'> = { boxtal_order_id: boxtalOrderId }
  if (shippingCost !== null) updates.shipping_cost = shippingCost

  // Rattrapage du suivi : le webhook ne rejoue pas les événements déjà émis.
  const tracking = await getBoxtalTracking(boxtalOrderId)
  if (tracking) {
    if (tracking.trackingNumber) updates.tracking_number = tracking.trackingNumber
    if (tracking.trackingUrl) updates.tracking_url = tracking.trackingUrl

    // Mêmes gardes que le webhook : jamais de retour en arrière de statut.
    const advanced: ShopOrderStatus | null =
      tracking.status === 'DELIVERED' ? 'delivered'
      : tracking.status === 'SHIPPED' || tracking.status === 'IN_TRANSIT' ? 'shipped'
      : null
    if (advanced === 'shipped' && ['confirmed', 'processing'].includes(order.status))
      updates.status = 'shipped'
    else if (advanced === 'delivered' && ['confirmed', 'processing', 'shipped'].includes(order.status))
      updates.status = 'delivered'
  }

  const { data, error } = await supabaseAdmin
    .from('shop_orders').update(updates).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.info('[boxtal-link]', JSON.stringify({ orderId: id, boxtalOrderId, trackingFound: Boolean(tracking) }))

  return NextResponse.json({ order: data, tracking_found: Boolean(tracking) })
}
