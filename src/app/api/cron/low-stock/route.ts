import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendCriticalAlert } from '@/lib/alert'
import { LOW_STOCK_THRESHOLD } from '@/lib/stock'

/**
 * Digest hebdomadaire des stocks bas (déclaré dans vercel.json, lundi 8 h).
 *
 * Le badge orange de `/admin/boutique` ne sert que si on ouvre la page : sans ce
 * rappel, une rupture de stock se découvre au moment où un client ne peut plus
 * commander. Ne compte que les produits actifs à stock fini — les pièces imprimées
 * à la commande (`stock: null`) n'ont pas de rupture possible.
 *
 * Protection : Vercel Cron envoie `Authorization: Bearer $CRON_SECRET` dès que la
 * variable est définie. Sans secret configuré on refuse (fail-closed), sinon
 * n'importe qui pourrait déclencher des emails en boucle.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/low-stock] CRON_SECRET non configuré — requête refusée')
    return NextResponse.json({ error: 'Cron non configuré' }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('shop_products')
    .select('name, slug, stock')
    .eq('active', true)
    .not('stock', 'is', null)
    .lte('stock', LOW_STOCK_THRESHOLD)
    .order('stock', { ascending: true })

  if (error) {
    console.error('[cron/low-stock] erreur lecture produits:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const low = data ?? []
  if (low.length === 0) {
    console.info('[cron/low-stock]', JSON.stringify({ event: 'ok', lowStock: 0 }))
    return NextResponse.json({ checked: true, lowStock: 0 })
  }

  const outOfStock = low.filter((p) => p.stock === 0)

  await sendCriticalAlert(
    `Stocks bas — ${low.length} produit${low.length > 1 ? 's' : ''} à réimprimer`,
    {
      seuil: LOW_STOCK_THRESHOLD,
      en_rupture: outOfStock.length > 0 ? outOfStock.map((p) => p.name).join(', ') : 'aucun',
      ...Object.fromEntries(low.map((p) => [p.name, `${p.stock} restant${(p.stock ?? 0) > 1 ? 's' : ''}`])),
      admin: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'}/admin/boutique`,
    },
  )

  console.info('[cron/low-stock]', JSON.stringify({ event: 'alerted', lowStock: low.length, outOfStock: outOfStock.length }))
  return NextResponse.json({ checked: true, lowStock: low.length })
}
