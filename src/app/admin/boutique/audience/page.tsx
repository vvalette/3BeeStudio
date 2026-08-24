import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import {
  buildProductStats,
  buildDailySeries,
  parisDay,
  shiftDay,
  type OrderForStats,
  type StatsTotals,
} from '@/lib/product-stats'
import { fetchDailyStats } from '@/lib/product-stats.queries'
import AdminProductAudience, {
  type AudienceProduct,
  type AudienceWindow,
  type AudienceWindows,
} from '@/components/admin/AdminProductAudience'

export const dynamic = 'force-dynamic'

// La plus longue fenêtre proposée par l'écran : dimensionne la lecture en base.
const MAX_WINDOW = 90

export default async function AdminAudiencePage() {
  if (!(await isAuthenticated())) redirect('/admin')

  const today = parisDay()
  // 2× la plus grande fenêtre : la période précédente sert au calcul de tendance.
  const fromDay = shiftDay(today, -(MAX_WINDOW * 2 - 1))

  const [{ data: products }, daily, { data: totalsData }, { data: ordersData }] = await Promise.all([
    supabaseAdmin
      .from('shop_products')
      .select('id, name, slug, images, active, product_type, price, sale_price')
      .order('created_at', { ascending: false }),
    fetchDailyStats(fromDay),
    supabaseAdmin.from('shop_product_stats_totals').select('*'),
    // Limite explicite : au-delà, PostgREST tronquerait sans le dire. 1 000
    // commandes sur 180 jours laissent une marge très large à cette échelle.
    supabaseAdmin
      .from('shop_orders')
      .select('created_at, status, items')
      .gte('created_at', `${fromDay}T00:00:00Z`)
      .order('created_at', { ascending: false })
      .limit(1000),
  ])

  const totals: StatsTotals[] = (totalsData ?? [])
    .filter((t): t is typeof t & { product_id: string } => t.product_id !== null)
    .map((t) => ({
      product_id: t.product_id,
      views:      t.views ?? 0,
      uniques:    t.uniques ?? 0,
      carts:      t.carts ?? 0,
      first_day:  t.first_day,
    }))

  const orders = (ordersData ?? []) as OrderForStats[]

  // Les trois fenêtres sont calculées côté serveur puis envoyées ensemble :
  // basculer 7 j ↔ 90 j dans l'écran ne déclenche aucune requête.
  const buildWindow = (days: AudienceWindow) => ({
    stats:  Object.fromEntries(buildProductStats({ daily, orders, totals, days, today })),
    series: buildDailySeries(daily, days, today),
  })

  const windows: AudienceWindows = {
    7:  buildWindow(7),
    30: buildWindow(30),
    90: buildWindow(90),
  }

  return (
    <AdminProductAudience
      products={(products ?? []) as AudienceProduct[]}
      windows={windows}
      measuring={daily.length > 0}
    />
  )
}
