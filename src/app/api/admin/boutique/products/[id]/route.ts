import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { isAuthenticated } from '@/lib/auth'
import { generateSlug } from '@/types/shop-product'
import type { ShopProduct } from '@/types/shop-product'
import { z } from 'zod'

const patchSchema = z.object({
  name:            z.string().min(2).max(120).optional(),
  slug:            z.string().optional(),
  subtitle:        z.string().max(80).nullable().optional(),
  description:     z.string().max(2000).optional(),
  name_en:         z.string().max(120).nullable().optional(),
  subtitle_en:     z.string().max(80).nullable().optional(),
  description_en:  z.string().max(2000).nullable().optional(),
  price:           z.number().int().positive().optional(),
  images:          z.array(z.string().url()).max(6).optional(),
  stock:           z.number().int().min(0).nullable().optional(),
  active:          z.boolean().optional(),
  weight_grams:    z.number().int().positive().optional(),
  stl_url:         z.string().url().nullable().optional(),
})

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('shop_products')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })

  const { data: current } = await supabaseAdmin
    .from('shop_products')
    .select('*')
    .eq('id', id)
    .single()

  if (!current) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

  const product = current as ShopProduct
  const d = parsed.data
  const updates: Record<string, unknown> = {}

  if (d.name !== undefined)           updates.name           = d.name
  if (d.subtitle !== undefined)       updates.subtitle       = d.subtitle
  if (d.description !== undefined)    updates.description    = d.description
  if (d.name_en !== undefined)        updates.name_en        = d.name_en
  if (d.subtitle_en !== undefined)    updates.subtitle_en    = d.subtitle_en
  if (d.description_en !== undefined) updates.description_en = d.description_en
  if (d.images !== undefined)         updates.images         = d.images
  if (d.stock !== undefined)          updates.stock          = d.stock
  if (d.active !== undefined)         updates.active         = d.active
  if (d.weight_grams !== undefined)   updates.weight_grams   = d.weight_grams
  if (d.stl_url !== undefined)        updates.stl_url        = d.stl_url
  if (d.slug !== undefined)           updates.slug           = d.slug
  else if (d.name && d.name !== product.name) updates.slug   = generateSlug(d.name)

  // Sync Stripe — produit
  if (product.stripe_product_id) {
    const stripeProductUpdates: Record<string, unknown> = {}
    if (d.name !== undefined)        stripeProductUpdates.name        = d.name
    if (d.description !== undefined) stripeProductUpdates.description = d.description || null
    if (d.images !== undefined)      stripeProductUpdates.images      = d.images.slice(0, 8)
    if (d.active !== undefined)      stripeProductUpdates.active      = d.active

    if (Object.keys(stripeProductUpdates).length > 0) {
      await stripe.products.update(product.stripe_product_id, stripeProductUpdates).catch((err) =>
        console.error('[boutique] Erreur update Stripe product:', err),
      )
    }
  }

  // Si le prix change, créer un nouveau Stripe Price et archiver l'ancien
  if (d.price !== undefined && d.price !== product.price) {
    if (product.stripe_product_id) {
      const newPrice = await stripe.prices.create({
        product:     product.stripe_product_id,
        unit_amount: d.price,
        currency:    'eur',
      })
      updates.stripe_price_id = newPrice.id
      updates.price           = d.price

      if (product.stripe_price_id) {
        await stripe.prices.update(product.stripe_price_id, { active: false }).catch(() => null)
      }
    } else {
      updates.price = d.price
    }
  }

  const { data: updated, error } = await supabaseAdmin
    .from('shop_products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params
  const { data: current } = await supabaseAdmin
    .from('shop_products')
    .select('stripe_product_id, stripe_price_id')
    .eq('id', id)
    .single()

  if (current) {
    const p = current as Pick<ShopProduct, 'stripe_product_id' | 'stripe_price_id'>
    if (p.stripe_product_id) {
      await stripe.products.update(p.stripe_product_id, { active: false }).catch(() => null)
    }
  }

  const { error } = await supabaseAdmin.from('shop_products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
