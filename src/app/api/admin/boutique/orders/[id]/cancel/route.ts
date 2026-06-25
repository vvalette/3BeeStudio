import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { cancelBoxtalShipment } from '@/lib/boxtal'
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
    .from('shop_orders')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !raw)
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  const order = raw as ShopOrder

  if (NON_CANCELLABLE.includes(order.status))
    return NextResponse.json(
      { error: `Impossible d'annuler une commande au statut « ${order.status} »` },
      { status: 400 }
    )

  const result = { stripeRefunded: false, boxtalCancelled: false, boxtalError: null as string | null }

  // ── Remboursement Stripe ──────────────────────────────────────────────────
  if (order.stripe_checkout_session_id && order.status !== 'pending_payment') {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        order.stripe_checkout_session_id,
        { expand: ['payment_intent'] }
      )
      const pi = session.payment_intent
      if (pi && typeof pi === 'object' && pi.status === 'succeeded') {
        await stripe.refunds.create({ payment_intent: pi.id })
        result.stripeRefunded = true
      }
    } catch (e) {
      console.error('[cancel] Erreur remboursement Stripe:', e)
      return NextResponse.json(
        { error: `Échec du remboursement Stripe : ${e instanceof Error ? e.message : String(e)}` },
        { status: 500 }
      )
    }
  }

  // ── Annulation Boxtal (best-effort) ───────────────────────────────────────
  if (order.boxtal_order_id) {
    try {
      await cancelBoxtalShipment(order.boxtal_order_id)
      result.boxtalCancelled = true
    } catch (e) {
      // L'annulation Boxtal peut échouer si le colis est déjà pris en charge.
      result.boxtalError = e instanceof Error ? e.message : String(e)
      console.warn('[cancel] Annulation Boxtal impossible:', result.boxtalError)
    }
  }

  // ── Mise à jour statut ────────────────────────────────────────────────────
  await supabaseAdmin
    .from('shop_orders')
    .update({ status: 'cancelled' })
    .eq('id', id)

  return NextResponse.json(result)
}
