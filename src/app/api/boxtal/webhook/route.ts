import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const computed = createHmac('sha256', secret).update(body).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
  } catch {
    return false
  }
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
  }> | undefined

  if (!trackings?.length) {
    return NextResponse.json({ received: true })
  }

  const { status, trackingNumber } = trackings[0]

  // SHIPPED = colis récupéré par le transporteur ou déposé en point relais
  // DELIVERED = livré au destinataire
  if (status === 'SHIPPED' || status === 'IN_TRANSIT') {
    const updates: Record<string, unknown> = { status: 'shipped' }
    if (trackingNumber) updates.tracking_number = trackingNumber

    const { error } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('boxtal_order_id', boxtalOrderId)
      .in('status', ['confirmed', 'processing', 'printing'])

    if (error) {
      console.error('[boxtal-webhook] erreur mise à jour shipped:', error)
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
    }

    console.log(`[boxtal-webhook] ${boxtalOrderId} → shipped (${status}, tracking: ${trackingNumber ?? 'N/A'})`)
  } else if (status === 'DELIVERED') {
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status: 'delivered' })
      .eq('boxtal_order_id', boxtalOrderId)
      .in('status', ['shipped'])

    if (error) {
      console.error('[boxtal-webhook] erreur mise à jour delivered:', error)
      return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
    }

    console.log(`[boxtal-webhook] ${boxtalOrderId} → delivered`)
  }

  return NextResponse.json({ received: true })
}
