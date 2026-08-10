import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { calcShopShipping, mergeCartQuantities, computeNewsletterDiscount } from '@/types/shop-product'
import type { ShopProduct } from '@/types/shop-product'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sendCriticalAlert } from '@/lib/alert'
import { z } from 'zod'

const schema = z.object({
  items: z.array(z.object({
    product_id:          z.string().uuid(),
    quantity:            z.number().int().min(1).max(100),
    custom_field_values: z.record(z.string().max(200)).optional(),
  })).min(1).max(20),
  email:         z.string().email(),
  name:          z.string().min(2),
  phone:         z.string().min(8),
  delivery_mode: z.enum(['delivery', 'pickup', 'relay']).default('delivery'),

  // Point relais — obligatoire quand delivery_mode === 'relay' :
  // l'API Boxtal refuse une expédition relais sans pickupPointCode.
  pickup_point_code:        z.string().min(1).max(40).optional(),
  pickup_point_name:        z.string().min(1).max(120).optional(),
  pickup_point_street:      z.string().max(160).optional(),
  pickup_point_city:        z.string().max(80).optional(),
  pickup_point_postal_code: z.string().max(10).optional(),
  locale:        z.enum(['fr', 'en']).default('fr'),
  // Adresse — requise uniquement pour la livraison à domicile
  shipping_name:        z.string().min(2).optional(),
  shipping_address:     z.string().min(5).optional(),
  shipping_address2:    z.string().optional(),
  shipping_city:        z.string().min(2).optional(),
  shipping_postal_code: z.string().min(4).max(6).optional(),
  shipping_country:     z.string().length(2).default('FR'),
}).refine(
  // Le relais exige aussi l'adresse : Boxtal veut un toAddress destinataire
  // en plus du point de retrait.
  (d) => d.delivery_mode === 'pickup' || (
    d.shipping_name && d.shipping_address && d.shipping_city && d.shipping_postal_code
  ),
  { message: 'Adresse de livraison requise pour la livraison à domicile' },
).refine(
  // Sans pickupPointCode, l'étiquette Boxtal sera refusée au moment de l'expédition.
  // On bloque ici plutôt que de laisser une commande payée inexpédiable.
  (d) => d.delivery_mode !== 'relay' || !!d.pickup_point_code,
  { message: 'Point relais requis pour la livraison en point relais' },
)

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const { ok, retryAfter } = await rateLimit(`shop-checkout:${ip}`, 10, 10 * 60 * 1000)
  if (!ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  try {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data

  // Fusionne les quantités d'un même produit (sécurité) — conserve les custom_field_values du 1er item
  const qtyByProduct = mergeCartQuantities(d.items)

  // Récupère tous les produits en une requête (service_role — bypass RLS)
  const { data: productsRaw, error: productsError } = await supabaseAdmin
    .from('shop_products')
    .select('*')
    .in('id', Array.from(qtyByProduct.keys()))
    .eq('active', true)

  if (productsError)
    return NextResponse.json({ error: 'Erreur lors de la récupération des produits' }, { status: 500 })

  const products = (productsRaw ?? []) as ShopProduct[]

  // Vérifie que tous les produits demandés existent et sont disponibles
  if (products.length !== qtyByProduct.size)
    return NextResponse.json({ error: 'Un ou plusieurs produits sont introuvables ou indisponibles' }, { status: 404 })

  // Récupère le paramètre livraison offerte globale
  const { data: settingsData } = await supabaseAdmin.from('shop_settings').select('key, value')
  const settingsMap = Object.fromEntries(
    (settingsData ?? []).map((s: { key: string; value: string }) => [s.key, s.value])
  )
  const globalFreeShipping = settingsMap.free_shipping === 'true'

  const lineItems: (
    | { price: string; quantity: number }
    | { price_data: { currency: string; product: string; unit_amount: number }; quantity: number }
    | { price_data: { currency: string; product_data: { name: string; images?: string[] }; unit_amount: number }; quantity: number }
  )[] = []
  const orderItems: { product_id: string; product_name: string; quantity: number; unit_price: number; weight_grams?: number }[] = []
  let subtotal = 0

  for (const product of products) {
    const entry     = qtyByProduct.get(product.id)!
    const quantity  = entry.quantity
    const unitPrice = product.sale_price ?? product.price

    if (product.stock !== null && product.stock < quantity)
      return NextResponse.json({ error: `Stock insuffisant pour « ${product.name} » (${product.stock} disponible${product.stock > 1 ? 's' : ''})` }, { status: 409 })

    if (product.sale_price !== null) {
      // Prix promotionnel → price_data inline (pas besoin du stripe_price_id)
      if (product.stripe_product_id) {
        lineItems.push({
          price_data: { currency: 'eur', product: product.stripe_product_id, unit_amount: product.sale_price },
          quantity,
        })
      } else {
        lineItems.push({
          price_data: {
            currency: 'eur',
            product_data: { name: product.name, images: product.images.slice(0, 8) },
            unit_amount: product.sale_price,
          },
          quantity,
        })
      }
    } else {
      if (!product.stripe_price_id)
        return NextResponse.json({ error: `« ${product.name} » n'est pas encore disponible à la vente` }, { status: 400 })
      lineItems.push({ price: product.stripe_price_id, quantity })
    }

    subtotal += unitPrice * quantity

    // Enrichit les custom_field_values avec les libellés définis sur le produit
    const rawCfv = entry.custom_field_values
    const enrichedCfv = rawCfv && product.custom_fields?.length
      ? product.custom_fields
          .filter((f) => rawCfv[f.key] !== undefined)
          .map((f) => ({ key: f.key, label: f.label, value: rawCfv[f.key] }))
      : undefined

    orderItems.push({
      product_id:   product.id,
      product_name: product.name,
      quantity,
      unit_price:   unitPrice,
      weight_grams: product.weight_grams,
      ...(enrichedCfv?.length ? { custom_field_values: enrichedCfv } : {}),
    })
  }

  const isPickup = d.delivery_mode === 'pickup'
  const isRelay  = d.delivery_mode === 'relay'
  const shipping = globalFreeShipping ? 0 : calcShopShipping(subtotal, d.delivery_mode)

  // Vérifie la promo newsletter (-10% sur le sous-total, frais de port inchangés)
  const { data: newsletterSub } = await supabaseAdmin
    .from('newsletter_subscriptions')
    .select('id')
    .eq('email', d.email)
    .eq('promo_used', false)
    .maybeSingle()

  const hasNewsletterDiscount = newsletterSub !== null
  const discountAmount        = hasNewsletterDiscount ? computeNewsletterDiscount(subtotal) : 0
  const total                 = subtotal - discountAmount + shipping

  // Crée la commande en base
  const { data: order, error: dbError } = await supabaseAdmin
    .from('shop_orders')
    .insert({
      email:                d.email,
      name:                 d.name,
      phone:                d.phone,
      items:                orderItems,
      subtotal,
      discount_amount:      discountAmount,
      shipping,
      total_amount:         total,
      status:               'pending_payment',
      delivery_mode:        d.delivery_mode,
      pickup_point_code:        isRelay ? (d.pickup_point_code ?? null) : null,
      pickup_point_name:        isRelay ? (d.pickup_point_name ?? null) : null,
      pickup_point_street:      isRelay ? (d.pickup_point_street ?? null) : null,
      pickup_point_city:        isRelay ? (d.pickup_point_city ?? null) : null,
      pickup_point_postal_code: isRelay ? (d.pickup_point_postal_code ?? null) : null,
      locale:               d.locale,
      shipping_name:        isPickup ? null : (d.shipping_name ?? null),
      shipping_address:     isPickup ? null : (d.shipping_address ?? null),
      shipping_address2:    isPickup ? null : (d.shipping_address2 ?? null),
      shipping_city:        isPickup ? null : (d.shipping_city ?? null),
      shipping_postal_code: isPickup ? null : (d.shipping_postal_code ?? null),
      shipping_country:     d.shipping_country,
    })
    .select()
    .single()

  if (dbError || !order) {
    console.error('[checkout] DB insert error:', JSON.stringify(dbError))
    return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 })
  }

  // Consomme la promo dès la création de la session (engagement de paiement)
  if (hasNewsletterDiscount && newsletterSub) {
    await supabaseAdmin
      .from('newsletter_subscriptions')
      .update({ promo_used: true })
      .eq('id', newsletterSub.id)
  }

  // Coupon Stripe one-shot si réduction newsletter applicable
  let stripeDiscounts: { coupon: string }[] = []
  if (hasNewsletterDiscount) {
    const coupon = await stripe.coupons.create({
      percent_off: 10,
      duration: 'once',
      name: 'Newsletter −10%',
      metadata: { source: 'newsletter', email: d.email, shop_order_id: order.id },
    })
    stripeDiscounts = [{ coupon: coupon.id }]
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const isEn   = d.locale === 'en'
  const prefix = isEn ? '/en' : ''

  // Textes affichés sur la page de paiement Stripe — localisés selon la langue du client.
  const tx = {
    pickupRate:   isEn ? 'Studio pickup (free)' : 'Retrait en studio (gratuit)',
    freeShipping: isEn ? 'Free delivery' : 'Livraison offerte',
    trackedShip:  isEn ? 'Tracked delivery' : 'Livraison suivie',
    relayRate:    isEn ? 'Pickup point delivery' : 'Livraison en point relais',
    relayMsg:     isEn
      ? 'Your parcel will be delivered to the pickup point you selected. Estimated time: 3 to 7 business days.'
      : 'Votre colis sera livré au point relais que vous avez choisi. Délai indicatif : 3 à 7 jours ouvrés.',
    pickupMsg:    isEn
      ? 'Studio pickup in Belleville-en-Beaujolais. We will contact you to arrange a time.'
      : 'Retrait en studio à Belleville-en-Beaujolais. Nous vous contacterons pour convenir d\'un créneau.',
    deliveryMsg:  isEn
      ? 'Your order is handmade in our studio. Estimated time: 3 to 7 business days.'
      : 'Votre commande est préparée à la main dans nos studios. Délai indicatif : 3 à 7 jours ouvrés.',
  }

  const session = await stripe.checkout.sessions.create({
    mode:           'payment',
    locale:         isEn ? 'en' : 'fr',
    submit_type:    'pay',
    customer_email: d.email,
    line_items:     lineItems,
    ...(stripeDiscounts.length > 0 ? { discounts: stripeDiscounts } : {}),
    ...(isPickup ? {} : {
      payment_intent_data: {
        shipping: {
          name: d.shipping_name!,
          address: {
            line1:       d.shipping_address!,
            line2:       d.shipping_address2 || '',
            city:        d.shipping_city!,
            postal_code: d.shipping_postal_code!,
            country:     d.shipping_country,
          },
        },
      },
    }),
    shipping_options: isPickup
      ? [
          {
            shipping_rate_data: {
              type:         'fixed_amount',
              fixed_amount: { amount: 0, currency: 'eur' },
              display_name: tx.pickupRate,
            },
          },
        ]
      : [
          {
            shipping_rate_data: {
              type:           'fixed_amount',
              fixed_amount:   { amount: shipping, currency: 'eur' },
              display_name:   shipping === 0
                ? tx.freeShipping
                : isRelay ? tx.relayRate : tx.trackedShip,
              delivery_estimate: {
                minimum: { unit: 'business_day', value: 3 },
                maximum: { unit: 'business_day', value: 7 },
              },
            },
          },
        ],
    custom_text: {
      submit: {
        message: isPickup ? tx.pickupMsg : isRelay ? tx.relayMsg : tx.deliveryMsg,
      },
    },
    success_url: `${appUrl}${prefix}/boutique/suivi/${order.id}?payment=success`,
    cancel_url:  `${appUrl}${prefix}/boutique?cancelled=true`,
    // Expire après 30 min (minimum Stripe) — au-delà, checkout.session.expired
    // nettoie la commande fantôme et libère la promo newsletter (cf. webhook).
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    metadata: {
      shop_order_id: order.id,
      type:          'shop_order',
      ...(hasNewsletterDiscount ? { newsletter_promo_email: d.email } : {}),
    },
  })

  await supabaseAdmin
    .from('shop_orders')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', order.id)

  return NextResponse.json({ checkout_url: session.url, order_id: order.id })

  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[checkout] Erreur non gérée:', detail)
    await sendCriticalAlert('Checkout boutique — erreur non gérée', {
      erreur: detail,
      consequence: 'Un client n\'a pas pu payer — vérifier Stripe/Supabase',
    })
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
