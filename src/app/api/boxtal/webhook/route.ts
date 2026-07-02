import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

function matches(computed: string, signature: string): boolean {
  try {
    const a = Buffer.from(computed)
    const b = Buffer.from(signature)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

// La doc Boxtal ne précise pas l'encodage du HMAC SHA256 → on accepte hex et base64.
function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const hex = createHmac('sha256', secret).update(body).digest('hex')
  const b64 = createHmac('sha256', secret).update(body).digest('base64')
  return matches(hex, signature) || matches(b64, signature)
}

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-bxt-signature')
  const secret = process.env.BOXTAL_WEBHOOK_SECRET

  // Fail-closed : sans secret configuré, on refuse (sinon n'importe qui pourrait
  // POSTer de faux événements de tracking pour changer le statut des commandes).
  if (!secret) {
    console.error('[boxtal-webhook] BOXTAL_WEBHOOK_SECRET non configuré — requête refusée')
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 })
  }

  if (!verifySignature(rawBody, signature, secret)) {
    console.warn('[boxtal-webhook] signature invalide')
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
  }

  if (body.type !== 'TRACKING_CHANGED') {
    return NextResponse.json({ received: true })
  }

  const boxtalOrderId = body.shippingOrderId as string | undefined
  if (!boxtalOrderId) {
    return NextResponse.json({ received: true })
  }

  const trackings = (body.payload as Record<string, unknown>)?.trackings as Array<{
    status: string
    trackingNumber?: string
    packageTrackingUrl?: string
  }> | undefined

  if (!trackings?.length) {
    return NextResponse.json({ received: true })
  }

  const { status, trackingNumber, packageTrackingUrl } = trackings[0]

  // 1. Infos de suivi = métadonnées → toujours rafraîchies (sans garde de statut),
  //    pour backfill l'URL même sur une commande déjà passée en "shipped".
  // On applique sur les deux tables (orders + shop_orders) : un boxtal_order_id
  // n'existe que dans l'une, la mise à jour de l'autre touche simplement 0 ligne.
  const trackingUpdates: Record<string, unknown> = {}
  if (trackingNumber) trackingUpdates.tracking_number = trackingNumber
  if (packageTrackingUrl) trackingUpdates.tracking_url = packageTrackingUrl
  if (Object.keys(trackingUpdates).length > 0) {
    for (const table of ['orders', 'shop_orders'] as const) {
      const { error } = await supabaseAdmin
        .from(table)
        .update(trackingUpdates)
        .eq('boxtal_order_id', boxtalOrderId)
      if (error) console.error(`[boxtal-webhook] erreur maj suivi (${table}):`, error)
    }
  }

  // 2. Transitions de statut avec gardes (évite tout retour en arrière).
  // SHIPPED = colis pris en charge / déposé ; DELIVERED = livré.
  if (status === 'SHIPPED' || status === 'IN_TRANSIT') {
    const { error: nfcErr } = await supabaseAdmin
      .from('orders')
      .update({ status: 'shipped' })
      .eq('boxtal_order_id', boxtalOrderId)
      .in('status', ['confirmed', 'processing'])
    const { error: shopErr } = await supabaseAdmin
      .from('shop_orders')
      .update({ status: 'shipped' })
      .eq('boxtal_order_id', boxtalOrderId)
      .in('status', ['confirmed', 'processing'])
    if (nfcErr || shopErr) {
      console.error('[boxtal-webhook] erreur mise à jour shipped:', nfcErr ?? shopErr)
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
    }
    console.info('[boxtal-webhook]', JSON.stringify({ event: 'shipped', boxtalOrderId, status, trackingNumber: trackingNumber ?? null }))
  } else if (status === 'DELIVERED') {
    const { error: nfcErr } = await supabaseAdmin
      .from('orders')
      .update({ status: 'delivered' })
      .eq('boxtal_order_id', boxtalOrderId)
      .in('status', ['shipped'])
    const { error: shopErr } = await supabaseAdmin
      .from('shop_orders')
      .update({ status: 'delivered' })
      .eq('boxtal_order_id', boxtalOrderId)
      .in('status', ['shipped'])
    if (nfcErr || shopErr) {
      console.error('[boxtal-webhook] erreur mise à jour delivered:', nfcErr ?? shopErr)
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
    }
    console.info('[boxtal-webhook]', JSON.stringify({ event: 'delivered', boxtalOrderId }))
  }

  return NextResponse.json({ received: true })
}
