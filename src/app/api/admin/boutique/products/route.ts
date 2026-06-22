import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { isAuthenticated } from '@/lib/auth'
import { generateSlug } from '@/types/shop-product'
import { z } from 'zod'

const customFieldSchema = z.object({
  key:      z.string().min(1).max(50),
  label:    z.string().min(1).max(80),
  label_en: z.string().max(80).optional(),
  required: z.boolean(),
})

const createSchema = z.object({
  name:            z.string().min(2).max(120),
  slug:            z.string().optional(),
  subtitle:        z.string().max(80).nullable().optional(),
  description:     z.string().max(2000).default(''),
  name_en:         z.string().max(120).nullable().optional(),
  subtitle_en:     z.string().max(80).nullable().optional(),
  description_en:  z.string().max(2000).nullable().optional(),
  price:           z.number().int().positive(),
  sale_price:      z.number().int().positive().nullable().optional(),
  images:          z.array(z.string().url()).max(6).default([]),
  stock:           z.number().int().min(0).nullable().default(null),
  active:          z.boolean().default(true),
  weight_grams:    z.number().int().positive().default(100),
  stl_url:         z.string().url().nullable().optional(),
  custom_fields:   z.array(customFieldSchema).default([]),
  category:        z.string().max(80).nullable().optional(),
  featured:        z.boolean().default(false),
})

export async function GET() {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('shop_products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data
  const slug = d.slug ?? generateSlug(d.name)

  // Crée le produit dans Stripe
  const stripeProduct = await stripe.products.create({
    name: d.name,
    description: d.description || undefined,
    images: d.images.length > 0 ? d.images.slice(0, 8) : undefined,
    metadata: { source: '3beestudio_boutique' },
  })

  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: d.price,
    currency: 'eur',
  })

  const { data: product, error } = await supabaseAdmin
    .from('shop_products')
    .insert({
      name:              d.name,
      slug,
      subtitle:          d.subtitle ?? null,
      description:       d.description,
      name_en:           d.name_en ?? null,
      subtitle_en:       d.subtitle_en ?? null,
      description_en:    d.description_en ?? null,
      price:             d.price,
      sale_price:        d.sale_price ?? null,
      images:            d.images,
      stock:             d.stock,
      active:            d.active,
      weight_grams:      d.weight_grams,
      stl_url:           d.stl_url ?? null,
      custom_fields:     d.custom_fields,
      category:          d.category ?? null,
      featured:          d.featured,
      stripe_product_id: stripeProduct.id,
      stripe_price_id:   stripePrice.id,
    })
    .select()
    .single()

  if (error) {
    // Rollback Stripe si l'insertion Supabase échoue
    await stripe.products.update(stripeProduct.id, { active: false }).catch(() => null)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(product, { status: 201 })
}
