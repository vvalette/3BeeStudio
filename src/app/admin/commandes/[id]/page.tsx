import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { Order } from '@/types/order'
import AdminOrderDetail from '@/components/admin/AdminOrderDetail'

export const dynamic = 'force-dynamic'

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (!(await isAuthenticated())) redirect('/admin')

  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  return <AdminOrderDetail order={data as Order} />
}
