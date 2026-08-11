import AdminLogin from '@/components/admin/AdminLogin'
import AdminDashboard from '@/components/admin/AdminDashboard'
import { isAuthenticated } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { Order } from '@/types/order'
import type { CustomOrder } from '@/types/custom-order'
import type { ShopOrder } from '@/types/shop-order'
import type { ShopProduct } from '@/types/shop-product'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  if (!(await isAuthenticated())) {
    return <AdminLogin />
  }

  // Début du mois courant en heure locale, converti en ISO pour la requête.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // Deux jeux de requêtes distincts, et c'est volontaire :
  // — les tâches ne concernent que le travail en attente, donc hors statuts terminaux ;
  // — le CA du mois doit au contraire inclure les commandes livrées, sinon il fond
  //   à mesure que les commandes se terminent.
  const [
    { data: orders }, { data: customOrders }, { data: shopOrders }, { data: products },
    { data: nfcMonth }, { data: customMonth }, { data: shopMonth },
  ] = await Promise.all([
    supabaseAdmin.from('orders').select('*')
      .not('status', 'in', '(delivered,cancelled)')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('custom_orders').select('*')
      .not('status', 'in', '(delivered,cancelled)')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('shop_orders').select('*')
      .not('status', 'in', '(delivered,cancelled)')
      .order('created_at', { ascending: false }),
    supabaseAdmin.from('shop_products').select('*').eq('active', true),

    supabaseAdmin.from('orders').select('total_amount')
      .gte('created_at', monthStart).not('status', 'in', '(pending_payment,cancelled)'),
    supabaseAdmin.from('custom_orders').select('deposit_amount')
      .gte('created_at', monthStart).in('status', ['deposit_paid', 'in_production', 'shipped', 'delivered']),
    supabaseAdmin.from('shop_orders').select('total_amount')
      .gte('created_at', monthStart).not('status', 'in', '(pending_payment,cancelled)'),
  ])

  const monthRevenue =
      (nfcMonth ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0)
    + (shopMonth ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0)
    + (customMonth ?? []).reduce((s, o) => s + (o.deposit_amount ?? 0), 0)

  return (
    <AdminDashboard
      orders={(orders ?? []) as Order[]}
      customOrders={(customOrders ?? []) as CustomOrder[]}
      shopOrders={(shopOrders ?? []) as ShopOrder[]}
      products={(products ?? []) as ShopProduct[]}
      monthRevenue={monthRevenue}
    />
  )
}
