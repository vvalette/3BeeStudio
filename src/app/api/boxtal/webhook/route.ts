import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import {
  sendNfcShipmentNotification, sendShopShipmentNotification, sendCustomShipmentNotification,
  sendNfcDeliveredNotification, sendShopDeliveredNotification, sendCustomDeliveredNotification,
} from '@/lib/resend'
import type { Order } from '@/types/order'
import type { ShopOrder } from '@/types/shop-order'
import type { CustomOrder } from '@/types/custom-order'

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
  // On applique sur les trois tables : un boxtal_order_id n'existe que dans
  // l'une, la mise à jour des autres touche simplement 0 ligne.
  const trackingUpdates: { tracking_number?: string; tracking_url?: string } = {}
  if (trackingNumber) trackingUpdates.tracking_number = trackingNumber
  if (packageTrackingUrl) trackingUpdates.tracking_url = packageTrackingUrl
  if (Object.keys(trackingUpdates).length > 0) {
    for (const table of ['orders', 'shop_orders', 'custom_orders'] as const) {
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
    // `.select()` sur l'update gardé porte l'idempotence de l'email : seul le
    // premier événement fait basculer confirmed|processing → shipped et renvoie
    // donc une ligne. Boxtal rejoue TRACKING_CHANGED à chaque scan transporteur —
    // sans cette garde le client recevrait un mail par scan.
    const { data: nfcShipped, error: nfcErr } = await supabaseAdmin
      .from('orders')
      .update({ status: 'shipped' })
      .eq('boxtal_order_id', boxtalOrderId)
      .in('status', ['confirmed', 'processing'])
      .select()
    const { data: shopShipped, error: shopErr } = await supabaseAdmin
      .from('shop_orders')
      .update({ status: 'shipped' })
      .eq('boxtal_order_id', boxtalOrderId)
      .in('status', ['confirmed', 'processing'])
      .select()
    // Sur-mesure : la production précède l'expédition, les statuts de départ ne
    // sont donc pas les mêmes que pour un colis de série.
    const { data: customShipped, error: customErr } = await supabaseAdmin
      .from('custom_orders')
      .update({ status: 'shipped' })
      .eq('boxtal_order_id', boxtalOrderId)
      .in('status', ['deposit_paid', 'in_production'])
      .select()
    if (nfcErr || shopErr || customErr) {
      console.error('[boxtal-webhook] erreur mise à jour shipped:', nfcErr ?? shopErr ?? customErr)
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
    }

    // Jamais bloquant : un échec Resend ne doit pas faire répondre 500 (Boxtal
    // retenterait alors que la commande est déjà passée en expédiée en base).
    await Promise.all([
      ...((nfcShipped ?? []) as Order[]).map((o) =>
        sendNfcShipmentNotification(o).catch((err) =>
          console.error('[boxtal-webhook] email expédition NFC non bloquant:', err)),
      ),
      ...((shopShipped ?? []) as ShopOrder[]).map((o) =>
        sendShopShipmentNotification(o).catch((err) =>
          console.error('[boxtal-webhook] email expédition boutique non bloquant:', err)),
      ),
      ...((customShipped ?? []) as CustomOrder[]).map((o) =>
        sendCustomShipmentNotification(o).catch((err) =>
          console.error('[boxtal-webhook] email expédition sur-mesure non bloquant:', err)),
      ),
    ])

    console.info('[boxtal-webhook]', JSON.stringify({
      event: 'shipped', boxtalOrderId, status,
      trackingNumber: trackingNumber ?? null,
      notified: (nfcShipped?.length ?? 0) + (shopShipped?.length ?? 0) + (customShipped?.length ?? 0),
    }))
  } else if (status === 'DELIVERED') {
    // `.select()` sur l'update gardé porte l'idempotence de l'email, comme pour
    // l'expédition : seul le premier DELIVERED fait basculer shipped → delivered
    // et renvoie donc une ligne. Boxtal rejoue l'événement à chaque scan.
    const { data: nfcDelivered, error: nfcErr } = await supabaseAdmin
      .from('orders')
      .update({ status: 'delivered' })
      .eq('boxtal_order_id', boxtalOrderId)
      .in('status', ['shipped'])
      .select()
    const { data: shopDelivered, error: shopErr } = await supabaseAdmin
      .from('shop_orders')
      .update({ status: 'delivered' })
      .eq('boxtal_order_id', boxtalOrderId)
      .in('status', ['shipped'])
      .select()
    const { data: customDelivered, error: customErr } = await supabaseAdmin
      .from('custom_orders')
      .update({ status: 'delivered' })
      .eq('boxtal_order_id', boxtalOrderId)
      .in('status', ['shipped'])
      .select()
    if (nfcErr || shopErr || customErr) {
      console.error('[boxtal-webhook] erreur mise à jour delivered:', nfcErr ?? shopErr ?? customErr)
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
    }

    // « Colis arrivé » + demande d'avis Google. Jamais bloquant : un échec
    // Resend ne doit pas faire répondre 500 à Boxtal, qui retenterait alors que
    // la commande est déjà passée en livrée.
    await Promise.all([
      ...((nfcDelivered ?? []) as Order[]).map((o) =>
        sendNfcDeliveredNotification(o).catch((err) =>
          console.error('[boxtal-webhook] email livraison NFC non bloquant:', err)),
      ),
      ...((shopDelivered ?? []) as ShopOrder[]).map((o) =>
        sendShopDeliveredNotification(o).catch((err) =>
          console.error('[boxtal-webhook] email livraison boutique non bloquant:', err)),
      ),
      ...((customDelivered ?? []) as CustomOrder[]).map((o) =>
        sendCustomDeliveredNotification(o).catch((err) =>
          console.error('[boxtal-webhook] email livraison sur-mesure non bloquant:', err)),
      ),
    ])

    console.info('[boxtal-webhook]', JSON.stringify({
      event: 'delivered', boxtalOrderId,
      notified: (nfcDelivered?.length ?? 0) + (shopDelivered?.length ?? 0) + (customDelivered?.length ?? 0),
    }))
  }

  return NextResponse.json({ received: true })
}
