import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { ShopOrder } from '@/types/shop-order'
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

  return <AdminShopOrderDetail order={data as ShopOrder} />
}
