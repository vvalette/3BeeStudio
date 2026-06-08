import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import type { Order } from '@/types/order'
import AdminOrdersList from '@/components/admin/AdminOrdersList'

export const dynamic = 'force-dynamic'

export default async function AdminCommandesPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== process.env.ADMIN_PASSWORD) redirect('/admin')

  const { data } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  return <AdminOrdersList orders={(data ?? []) as Order[]} />
}
