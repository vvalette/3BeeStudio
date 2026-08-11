import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { Order } from '@/types/order'
import type { CustomOrder } from '@/types/custom-order'
import type { ShopOrder } from '@/types/shop-order'
import AdminOrdersList, { type OrderDownloads } from '@/components/admin/AdminOrdersList'

export const dynamic = 'force-dynamic'

export default async function AdminCommandesPage() {
  if (!(await isAuthenticated())) redirect('/admin')

  const [{ data: orders }, { data: customOrders }, { data: shopOrders }, { data: downloads }] = await Promise.all([
    supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('custom_orders').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('shop_orders').select('*').order('created_at', { ascending: false }),
    // Compteurs de téléchargement, pour afficher « 2/10 consommés » sur la liste
    // des commandes de fichiers sans une requête par ligne.
    supabaseAdmin
      .from('shop_order_downloads')
      .select('order_id, file_name, download_count, max_downloads, expires_at')
      .order('created_at', { ascending: true }),
  ])

  const downloadsByOrder = (downloads ?? []).reduce<OrderDownloads>((acc, d) => {
    (acc[d.order_id] ??= []).push({
      file_name:      d.file_name,
      download_count: d.download_count,
      max_downloads:  d.max_downloads,
      expires_at:     d.expires_at,
    })
    return acc
  }, {})

  return (
    <AdminOrdersList
      orders={(orders ?? []) as Order[]}
      customOrders={(customOrders ?? []) as CustomOrder[]}
      shopOrders={(shopOrders ?? []) as ShopOrder[]}
      downloadsByOrder={downloadsByOrder}
    />
  )
}
