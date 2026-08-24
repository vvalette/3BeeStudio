import { supabaseAdmin } from './supabase'
import type { DailyStat } from './product-stats'

/**
 * Lectures Supabase de l'audience produit.
 *
 * Module séparé de `product-stats.ts` (agrégation pure, testable) et de
 * `product-stats.server.ts` (hash visiteur) : importer le client Supabase le
 * rendrait inutilisable en test, où les variables d'environnement sont absentes.
 */

/**
 * Statistiques quotidiennes depuis `from` (jour ISO inclus).
 *
 * PostgREST plafonne les réponses (1 000 lignes par défaut chez Supabase) : sur
 * plusieurs mois × N produits la table dépasse ce seuil, et l'écran afficherait
 * silencieusement des chiffres tronqués. D'où la pagination explicite.
 *
 * Une erreur (typiquement : migration 036 pas encore appliquée) renvoie une liste
 * vide plutôt que de faire planter la page — l'écran sait le dire.
 */
export async function fetchDailyStats(from: string): Promise<DailyStat[]> {
  const PAGE = 1000
  const rows: DailyStat[] = []

  for (let offset = 0; offset < 50_000; offset += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('shop_product_stats_daily')
      .select('product_id, day, views, uniques, carts')
      .gte('day', from)
      .order('day', { ascending: true })
      .range(offset, offset + PAGE - 1)

    if (error) {
      console.error('[product-stats] lecture stats:', error.message)
      break
    }
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }

  return rows
}
