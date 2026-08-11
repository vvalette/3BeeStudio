import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { ShopOrder, ShopOrderDownload } from '@/types/shop-order'
import AdminShopOrderDetail from '@/components/admin/AdminShopOrderDetail'

export const dynamic = 'force-dynamic'

export default async function AdminShopOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (!(await isAuthenticated())) redirect('/admin')

  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('shop_orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const order = data as ShopOrder

  // Droits de téléchargement de cette commande, pour la carte « Fichiers vendus »
  // (compteurs, expiration, réouverture d'accès).
  const { data: downloads } = order.has_digital
    ? await supabaseAdmin
        .from('shop_order_downloads')
        .select('id, order_id, product_id, file_name, download_count, max_downloads, expires_at, last_download_at')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true })
    : { data: [] }

  return <AdminShopOrderDetail order={order} downloads={(downloads ?? []) as ShopOrderDownload[]} />
}
