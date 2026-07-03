import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { ShopProduct } from '@/types/shop-product'
import { effectivePrice } from '@/types/shop-product'
import type { CartItem } from '@/types/cart'

// Résout un produit « Acheter maintenant » (?product=&qty= du checkout) en CartItem.
// Permet à /boutique/commande de rester statique : la lecture des searchParams
// et la requête Supabase se font côté client via cette route.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const qty = searchParams.get('qty')

  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  const { data } = await supabase
    .from('shop_products')
    .select('id, name, slug, price, sale_price, images, stock')
    .eq('id', id)
    .eq('active', true)
    .single()

  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const p = data as ShopProduct
  const quantity = Math.max(1, Math.min(parseInt(qty ?? '1', 10) || 1, p.stock ?? 99))

  const item: CartItem = {
    product_id:     p.id,
    name:           p.name,
    slug:           p.slug,
    price:          effectivePrice(p),
    original_price: p.sale_price !== null ? p.price : null,
    image:          p.images[0] ?? null,
    quantity,
    max_stock:      p.stock,
  }

  return NextResponse.json({ item })
}
