import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { reconcileCart, cartItemsFromSnapshot, type CartSyncProduct } from '@/lib/cart-sync'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import type { AbandonedCart } from '@/types/abandoned-cart'
import { z } from 'zod'

/**
 * Reprise d'un panier abandonné depuis le lien de l'email de relance.
 *
 * Le lien ne peut pas pointer vers l'ancienne session Stripe : elle expire au
 * bout de 30 minutes, bien avant que la relance ne parte. On reconstruit donc le
 * panier ici, à partir de l'instantané pris au moment de l'abandon.
 *
 * Les prix, noms, stocks et coloris de l'instantané ne servent PAS : ils sont
 * relus dans `shop_products` et passés à `reconcileCart`, le même chemin que
 * pour un panier resté en localStorage. Sinon un panier de la veille repartirait
 * à l'ancien prix, et `/api/boutique/checkout` en facturerait un autre. Les
 * lignes devenues inachetables (produit désactivé, rupture) disparaissent.
 */

const schema = z.object({
  token: z.string().min(10).max(200),
})

export async function POST(req: Request) {
  // Le jeton est un secret : sans limite, la route se prête à un balayage.
  const ip = getClientIp(req)
  const { ok, retryAfter } = await rateLimit(`cart-restore:${ip}`, 20, 10 * 60 * 1000)
  if (!ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const { data: cartRow } = await supabaseAdmin
    .from('abandoned_carts')
    .select('*')
    .eq('token', parsed.data.token)
    .maybeSingle()

  if (!cartRow) return NextResponse.json({ error: 'Lien inconnu ou expiré' }, { status: 404 })

  const cart = cartRow as unknown as AbandonedCart
  const ids  = Array.from(new Set(cart.items.map((i) => i.product_id)))
  if (ids.length === 0) return NextResponse.json({ items: [] })

  const { data: productsData, error } = await supabase
    .from('shop_products')
    .select('id, name, slug, price, sale_price, images, stock, product_type, colors')
    .in('id', ids)
    .eq('active', true)

  if (error) return NextResponse.json({ error: 'Erreur lors de la lecture des produits' }, { status: 500 })

  const products = (productsData ?? []) as unknown as CartSyncProduct[]

  // L'instantané donne des lignes « périmées » que `reconcileCart` réaligne
  // ensuite sur l'état réel des produits : prix, stock, nom et coloris du jour.
  const items = reconcileCart(cartItemsFromSnapshot(cart.items), products)

  return NextResponse.json({
    items,
    // Pré-remplit le formulaire : le client a déjà saisi ces champs une fois, les
    // lui redemander est précisément la friction qu'on essaie de lever. L'adresse,
    // elle, n'est pas reprise (l'instantané ne la contient pas).
    contact: { name: cart.name, email: cart.email },
    // Renvoyé au checkout pour attribuer la commande à cette relance.
    token: cart.token,
  })
}
