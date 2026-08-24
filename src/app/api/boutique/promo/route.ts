import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { checkPromo, normalizeCode, promoReplacesNewsletter } from '@/lib/promo'
import { splitCart } from '@/types/shop-product'
import type { ShopProduct } from '@/types/shop-product'
import type { PromoCode } from '@/types/promo'
import { z } from 'zod'

/**
 * Aperçu d'un code promo au checkout, avant le départ vers Stripe.
 *
 * Cette route ne consomme rien et ne fait foi de rien : elle sert à afficher la
 * remise pendant que le client remplit le formulaire. Le montant réellement
 * appliqué est recalculé par /api/boutique/checkout à partir du code seul — un
 * client qui bricolerait la réponse ici n'obtiendrait aucune remise.
 */

const schema = z.object({
  code:  z.string().min(1).max(40),
  email: z.string().email().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity:   z.number().int().min(1).max(100),
  })).min(1).max(20),
})

export async function POST(req: Request) {
  // Un code promo se devine (NOEL, BIENVENUE…). Sans limite, la route serait un
  // oracle pour tester des milliers de codes.
  const ip = getClientIp(req)
  const { ok, retryAfter } = await rateLimit(`promo-check:${ip}`, 15, 10 * 60 * 1000)
  if (!ok) {
    return NextResponse.json(
      { valid: false, reason: 'trop_de_tentatives' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ valid: false, reason: 'introuvable' }, { status: 400 })

  const { code, email, items } = parsed.data

  const { data: promoRow } = await supabaseAdmin
    .from('promo_codes')
    .select('*')
    .eq('code', normalizeCode(code))
    .maybeSingle()

  const promo = promoRow as PromoCode | null

  // Prix relus en base : le panier du navigateur ne décide pas des montants.
  const { data: productsRaw } = await supabaseAdmin
    .from('shop_products')
    .select('id, price, sale_price, product_type')
    .in('id', items.map((i) => i.product_id))
    .eq('active', true)

  const priced = (productsRaw ?? []) as Pick<ShopProduct, 'id' | 'price' | 'sale_price' | 'product_type'>[]
  const byId = new Map(priced.map((p) => [p.id, p]))

  const cart = splitCart(
    items.flatMap((i) => {
      const p = byId.get(i.product_id)
      if (!p) return []
      return [{ product_type: p.product_type, unit_price: p.sale_price ?? p.price, quantity: i.quantity }]
    }),
  )

  const outcome = checkPromo(promo, cart)
  if (!outcome.ok) return NextResponse.json({ valid: false, reason: outcome.reason })

  // « Une seule fois par email » ne se tranche qu'en base. Vérifié ici pour le
  // dire tout de suite, et re-vérifié à la consommation (redeem_promo_code).
  if (promo!.once_per_email && email) {
    const { data: used } = await supabaseAdmin
      .from('promo_code_uses')
      .select('id')
      .eq('promo_code_id', promo!.id)
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    if (used) return NextResponse.json({ valid: false, reason: 'deja_utilise' })
  }

  return NextResponse.json({
    valid:               true,
    code:                promo!.code,
    type:                promo!.type,
    discount:            outcome.discount,
    free_shipping:       outcome.freeShipping,
    replaces_newsletter: promoReplacesNewsletter(promo!),
  })
}
