import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { CustomOrder } from '@/types/custom-order'
import AdminOrdersList from '@/components/admin/AdminOrdersList'

export const dynamic = 'force-dynamic'

export default async function AdminSurMesurePage() {
  if (!(await isAuthenticated())) redirect('/admin')

  const { data: customOrders } = await supabaseAdmin
    .from('custom_orders')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <AdminOrdersList
      orders={[]}
      customOrders={(customOrders ?? []) as CustomOrder[]}
      shopOrders={[]}
      initialSection="custom"
    />
  )
}
