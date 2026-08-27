import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { isAuthenticated } from '@/lib/auth'
import { generateSlug } from '@/types/shop-product'
import { revalidateShop } from '@/lib/revalidate'
import type { ShopProduct } from '@/types/shop-product'

/**
 * Duplique un produit : sortir une variante (BeeLid Max → BeeLid Mini) demandait
 * de re-saisir le formulaire entier, images, STL et contenu EN compris.
 *
 * La copie arrive volontairement **inactive** : elle porte encore le nom et les
 * visuels de l'original, la publier telle quelle mettrait deux fiches identiques
 * en boutique. On la modifie, puis on l'active.
 */

/** Le slug est l'URL publique du produit → il doit rester unique. */
async function uniqueSlug(base: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('shop_products')
    .select('slug')
    .like('slug', `${base}%`)

  const taken = new Set((data ?? []).map((r) => r.slug))
  if (!taken.has(base)) return base
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`
    if (!taken.has(candidate)) return candidate
  }
  // Garde-fou : suffixe temporel plutôt qu'une boucle infinie.
  return `${base}-${Date.now()}`
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await params

  const { data: raw, error: fetchError } = await supabaseAdmin
    .from('shop_products').select('*').eq('id', id).single()

  if (fetchError || !raw)
    return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

  const source = raw as ShopProduct
  const name = `${source.name} (copie)`
  const slug = await uniqueSlug(generateSlug(name))

  // Produit Stripe dédié : partager le stripe_price_id de l'original ferait
  // remonter les deux fiches sur la même ligne de reporting Stripe, et un
  // changement de prix sur l'une affecterait l'autre.
  const stripeProduct = await stripe.products.create({
    name,
    description: source.description || undefined,
    images: source.images.length > 0 ? source.images.slice(0, 8) : undefined,
    metadata: { source: '3beestudio_boutique', duplicated_from: source.id },
  })

  const stripePrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: source.price,
    currency: 'eur',
  })

  const { data: product, error } = await supabaseAdmin
    .from('shop_products')
    .insert({
      name,
      slug,
      subtitle:          source.subtitle,
      description:       source.description,
      name_en:           source.name_en ? `${source.name_en} (copy)` : null,
      subtitle_en:       source.subtitle_en,
      description_en:    source.description_en,
      price:             source.price,
      sale_price:        source.sale_price,
      images:            source.images,
      stock:             source.stock,
      active:            false,
      weight_grams:      source.weight_grams,
      stl_url:           source.stl_url,
      custom_fields:     source.custom_fields,
      colors:            source.colors ?? [],
      category:          source.category,
      featured:          false, // la mise en avant se décide fiche par fiche
      model_rotation:    source.model_rotation ?? { x: 0, y: 0, z: 0 },
      stripe_product_id: stripeProduct.id,
      stripe_price_id:   stripePrice.id,
    })
    .select()
    .single()

  if (error) {
    await stripe.products.update(stripeProduct.id, { active: false }).catch(() => null)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidateShop(slug)

  return NextResponse.json(product, { status: 201 })
}
