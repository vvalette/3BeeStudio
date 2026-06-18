import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { calcShopShipping } from '@/types/shop-product'
import type { ShopProduct } from '@/types/shop-product'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { z } from 'zod'

const schema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity:   z.number().int().min(1).max(100),
  })).min(1).max(20),
  email:         z.string().email(),
  name:          z.string().min(2),
  phone:         z.string().optional(),
  delivery_mode: z.enum(['delivery', 'pickup']).default('delivery'),
  locale:        z.enum(['fr', 'en']).default('fr'),
  // Adresse — requise uniquement pour la livraison à domicile
  shipping_name:        z.string().min(2).optional(),
  shipping_address:     z.string().min(5).optional(),
  shipping_address2:    z.string().optional(),
  shipping_city:        z.string().min(2).optional(),
  shipping_postal_code: z.string().min(4).max(6).optional(),
  shipping_country:     z.string().length(2).default('FR'),
}).refine(
  (d) => d.delivery_mode === 'pickup' || (
    d.shipping_name && d.shipping_address && d.shipping_city && d.shipping_postal_code
  ),
  { message: 'Adresse de livraison requise pour la livraison à domicile' },
)

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const { ok, retryAfter } = rateLimit(`shop-checkout:${ip}`, 10, 10 * 60 * 1000)
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

  // Fusionne les quantités d'un même produit (sécurité)
  const qtyByProduct = new Map<string, number>()
  for (const it of d.items) {
    qtyByProduct.set(it.product_id, (qtyByProduct.get(it.product_id) ?? 0) + it.quantity)
  }

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
  const orderItems: { product_id: string; product_name: string; quantity: number; unit_price: number }[] = []
  let subtotal = 0

  for (const product of products) {
    const quantity  = qtyByProduct.get(product.id)!
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
    orderItems.push({
      product_id:   product.id,
      product_name: product.name,
      quantity,
      unit_price:   unitPrice,
    })
  }

  const isPickup = d.delivery_mode === 'pickup'
  const shipping = isPickup ? 0 : (globalFreeShipping ? 0 : calcShopShipping(subtotal))

  // Vérifie la promo newsletter (-10% sur le sous-total, frais de port inchangés)
  const { data: newsletterSub } = await supabaseAdmin
    .from('newsletter_subscriptions')
    .select('id')
    .eq('email', d.email)
    .eq('promo_used', false)
    .maybeSingle()

  const hasNewsletterDiscount = newsletterSub !== null
  const discountAmount        = hasNewsletterDiscount ? Math.round(subtotal * 0.1) : 0
  const total                 = subtotal - discountAmount + shipping

  // Crée la commande en base
  const { data: order, error: dbError } = await supabaseAdmin
    .from('shop_orders')
    .insert({
      email:                d.email,
      name:                 d.name,
      phone:                d.phone ?? null,
      items:                orderItems,
      subtotal,
      discount_amount:      discountAmount,
      shipping,
      total_amount:         total,
      status:               'pending_payment',
      delivery_mode:        d.delivery_mode,
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

  const session = await stripe.checkout.sessions.create({
    mode:           'payment',
    locale:         d.locale === 'en' ? 'en' : 'fr',
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
              display_name: 'Retrait en studio (gratuit)',
            },
          },
        ]
      : [
          {
            shipping_rate_data: {
              type:           'fixed_amount',
              fixed_amount:   { amount: shipping, currency: 'eur' },
              display_name:   shipping === 0 ? 'Livraison offerte' : 'Livraison suivie',
              delivery_estimate: {
                minimum: { unit: 'business_day', value: 3 },
                maximum: { unit: 'business_day', value: 7 },
              },
            },
          },
        ],
    custom_text: {
      submit: {
        message: isPickup
          ? 'Retrait en studio à Belleville-en-Beaujolais. Nous vous contacterons pour convenir d\'un créneau.'
          : 'Votre commande est préparée à la main dans nos studios. Délai indicatif : 3 à 7 jours ouvrés.',
      },
    },
    success_url: `${appUrl}/boutique/suivi/${order.id}?payment=success`,
    cancel_url:  `${appUrl}/boutique?cancelled=true`,
    metadata: {
      shop_order_id: order.id,
      type:          'shop_order',
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
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
