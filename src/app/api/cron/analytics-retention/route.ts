import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Purge des données d'audience (déclaré dans vercel.json, lundi 4 h).
 *
 * Deux durées, pour deux natures de données :
 *  - les empreintes visiteur (`shop_product_view_hits`) ne servent qu'à
 *    dédoublonner les uniques du jour → 45 jours suffisent largement ;
 *  - les statistiques quotidiennes → 13 mois, durée maximale recommandée par la
 *    CNIL pour la mesure d'audience, et de quoi comparer à l'année précédente.
 *
 * Sans ce ménage la mesure sortirait de l'exemption de consentement (conservation
 * illimitée) — ce n'est pas une optimisation de stockage.
 *
 * Protection : même contrat que /api/cron/low-stock (Bearer CRON_SECRET, fail-closed).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/analytics-retention] CRON_SECRET non configuré — requête refusée')
    return NextResponse.json({ error: 'Cron non configuré' }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin.rpc('purge_product_stats')

  if (error) {
    console.error('[cron/analytics-retention] erreur purge:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const result = data?.[0] ?? { deleted_hits: 0, deleted_stats: 0 }
  console.info('[cron/analytics-retention]', JSON.stringify({ event: 'purged', ...result }))

  return NextResponse.json({ purged: true, ...result })
}
