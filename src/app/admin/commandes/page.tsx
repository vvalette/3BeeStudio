import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { Order } from '@/types/order'
import AdminOrdersList from '@/components/admin/AdminOrdersList'

export const dynamic = 'force-dynamic'

export default async function AdminCommandesPage() {
  if (!(await isAuthenticated())) redirect('/admin')

  const { data } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  return <AdminOrdersList orders={(data ?? []) as Order[]} />
}
