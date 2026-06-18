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
  email:                z.string().email(),
  name:                 z.string().min(2),
  phone:                z.string().optional(),
  shipping_name:        z.string().min(2),
  shipping_address:     z.string().min(5),
  shipping_address2:    z.string().optional(),
  shipping_city:        z.string().min(2),
  shipping_postal_code: z.string().min(4).max(6),
  shipping_country:     z.string().length(2).default('FR'),
})

export async function POST(req: Request) {
  const ip = getClientIp(req)
  const { ok, retryAfter } = rateLimit(`shop-checkout:${ip}`, 10, 10 * 60 * 1000)
  if (!ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

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

  const shipping = globalFreeShipping ? 0 : calcShopShipping(subtotal)
  const total    = subtotal + shipping

  // Crée la commande en base
  const { data: order, error: dbError } = await supabaseAdmin
    .from('shop_orders')
    .insert({
      email:                d.email,
      name:                 d.name,
      phone:                d.phone ?? null,
      items:                orderItems,
      subtotal,
      shipping,
      total_amount:         total,
      status:               'pending_payment',
      shipping_name:        d.shipping_name,
      shipping_address:     d.shipping_address,
      shipping_address2:    d.shipping_address2 ?? null,
      shipping_city:        d.shipping_city,
      shipping_postal_code: d.shipping_postal_code,
      shipping_country:     d.shipping_country,
    })
    .select()
    .single()

  if (dbError || !order)
    return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'

  const session = await stripe.checkout.sessions.create({
    mode:           'payment',
    locale:         'fr',
    submit_type:    'pay',
    customer_email: d.email,
    line_items:     lineItems,
    payment_intent_data: {
      shipping: {
        name: d.shipping_name,
        address: {
          line1:       d.shipping_address,
          line2:       d.shipping_address2 || '',
          city:        d.shipping_city,
          postal_code: d.shipping_postal_code,
          country:     d.shipping_country,
        },
      },
    },
    shipping_options: [
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
        message: 'Votre commande est préparée à la main dans nos studios. Délai indicatif : 3 à 7 jours ouvrés.',
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
}
