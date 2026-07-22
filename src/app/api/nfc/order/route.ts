import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { calcOrder, formatDestination, isVCard, byteLength, NFC_CHIP_BYTE_LIMIT } from '@/types/order'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { z } from 'zod'

const schema = z.object({
  company: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  sector: z.string().min(2),
  quantity: z.number().int().min(5),
  nfc_url: z.string()
    .min(1)
    .refine((v) => isVCard(v) || /^https?:/i.test(v), 'Destination invalide')
    .refine((v) => !isVCard(v) || byteLength(v) <= NFC_CHIP_BYTE_LIMIT, 'vCard trop longue'),
  logo_url: z.string().url(),
  shipping_name: z.string().min(2),
  shipping_address: z.string().min(5),
  shipping_address2: z.string().optional(),
  shipping_city: z.string().min(2),
  shipping_postal_code: z.string().min(4).max(6),
  shipping_country: z.string().length(2),
})

export async function POST(req: Request) {
  // Limite : 10 commandes / 10 min / IP (anti-spam DB + sessions Stripe)
  const ip = getClientIp(req)
  const { ok, retryAfter } = await rateLimit(`nfc-order:${ip}`, 10, 10 * 60 * 1000)
  if (!ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const data = parsed.data
  const { unitPrice, shipping, subtotal } = calcOrder(data.quantity)

  // Vérifie si l'email est abonné newsletter avec une promo encore disponible
  const { data: sub } = await supabaseAdmin
    .from('newsletter_subscriptions')
    .select('id, promo_used')
    .eq('email', data.email)
    .eq('promo_used', false)
    .maybeSingle()

  const hasNewsletterDiscount = sub !== null
  // -10 % sur le sous-total produits uniquement, les frais de port sont inchangés
  const discountedSubtotal = hasNewsletterDiscount ? Math.round(subtotal * 0.9) : subtotal
  const finalTotal = discountedSubtotal + shipping

  // 1. Créer la commande en base
  const { data: order, error: dbError } = await supabaseAdmin
    .from('orders')
    .insert({
      company: data.company,
      email: data.email,
      phone: data.phone,
      sector: data.sector,
      quantity: data.quantity,
      nfc_url: data.nfc_url,
      logo_url: data.logo_url,
      unit_price: unitPrice,
      total_amount: finalTotal,
      deposit_amount: finalTotal,
      status: 'pending_payment',
      shipping_name: data.shipping_name,
      shipping_address: data.shipping_address,
      shipping_address2: data.shipping_address2 ?? null,
      shipping_city: data.shipping_city,
      shipping_postal_code: data.shipping_postal_code,
      shipping_country: data.shipping_country,
    })
    .select()
    .single()

  if (dbError || !order) {
    return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 })
  }

  // Consomme la promo dès la création de la session (engagement de paiement)
  if (hasNewsletterDiscount && sub) {
    await supabaseAdmin
      .from('newsletter_subscriptions')
      .update({ promo_used: true })
      .eq('id', sub.id)
  }

  // 2. Session Stripe Checkout — paiement intégral
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    locale: 'fr',
    submit_type: 'pay',
    customer_email: data.email,
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Porte-clé connecté NFC personnalisé',
            description: hasNewsletterDiscount
              ? `Logo « ${data.company} » · Destination : ${formatDestination(data.nfc_url)} · ✨ -10% abonné`
              : `Logo « ${data.company} » · Destination : ${formatDestination(data.nfc_url)}`,
            images: [data.logo_url],
          },
          // Prix unitaire déjà réduit → Stripe affiche le bon montant par ligne
          unit_amount: hasNewsletterDiscount ? Math.round(unitPrice * 0.9) : unitPrice,
        },
        quantity: data.quantity,
      },
    ],
    payment_intent_data: {
      shipping: {
        name: data.shipping_name,
        address: {
          line1: data.shipping_address,
          line2: data.shipping_address2 || '',
          city: data.shipping_city,
          postal_code: data.shipping_postal_code,
          country: data.shipping_country,
        },
      },
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: { amount: shipping, currency: 'eur' },
          display_name: shipping === 0 ? 'Livraison offerte' : 'Livraison suivie',
          delivery_estimate: {
            minimum: { unit: 'business_day', value: 5 },
            maximum: { unit: 'business_day', value: 10 },
          },
        },
      },
    ],
    custom_text: {
      submit: {
        message:
          'Vos porte-clés sont imprimés en 3D et programmés à la main après confirmation. Délai indicatif : 5 à 10 jours ouvrés.',
      },
    },
    success_url: `${appUrl}/suivi/${order.id}?payment=success`,
    cancel_url: `${appUrl}/nfc?cancelled=true`,
    // Expire après 30 min (minimum Stripe) — au-delà, checkout.session.expired
    // nettoie la commande fantôme et libère la promo newsletter (cf. webhook).
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    metadata: {
      order_id: order.id,
      ...(hasNewsletterDiscount ? { newsletter_promo_email: data.email } : {}),
    },
  })

  // 3. Stocker l'ID de session Stripe
  await supabaseAdmin
    .from('orders')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', order.id)

  return NextResponse.json({ checkout_url: session.url, order_id: order.id })
}
