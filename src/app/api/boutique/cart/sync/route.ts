import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

/**
 * État courant des produits d'un panier — prix, nom, stock, coloris.
 *
 * Le panier vit en localStorage et fige ces valeurs au moment de l'ajout. Sans
 * cette relecture, un panier de la semaine dernière annonce l'ancien prix
 * jusqu'au récapitulatif du checkout, alors que /api/boutique/checkout facture
 * le prix courant : le client voyait un total et en payait un autre.
 *
 * Ne renvoie que des produits actifs — une ligne sans réponse est une ligne que
 * le CartProvider retire (cf. `reconcileCart`).
 */

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(20),
})

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const { data, error } = await supabase
    .from('shop_products')
    .select('id, name, slug, price, sale_price, images, stock, product_type, colors')
    .in('id', parsed.data.ids)
    .eq('active', true)

  if (error) return NextResponse.json({ error: 'Erreur lors de la lecture des produits' }, { status: 500 })

  return NextResponse.json({ products: data ?? [] })
}
