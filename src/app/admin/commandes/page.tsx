import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { Order } from '@/types/order'
import type { CustomOrder } from '@/types/custom-order'
import AdminOrdersList from '@/components/admin/AdminOrdersList'

export const dynamic = 'force-dynamic'

export default async function AdminCommandesPage() {
  if (!(await isAuthenticated())) redirect('/admin')

  const [{ data: orders }, { data: customOrders }] = await Promise.all([
    supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('custom_orders').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <AdminOrdersList
      orders={(orders ?? []) as Order[]}
      customOrders={(customOrders ?? []) as CustomOrder[]}
    />
  )
}
