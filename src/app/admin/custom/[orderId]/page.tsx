import { notFound, redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { CustomOrder } from '@/types/custom-order'
import AdminCustomOrderDetail from '@/components/admin/AdminCustomOrderDetail'

export const dynamic = 'force-dynamic'

export default async function AdminCustomOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  if (!(await isAuthenticated())) redirect('/admin')

  const { orderId } = await params
  const { data } = await supabaseAdmin
    .from('custom_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (!data) notFound()

  return <AdminCustomOrderDetail order={data as CustomOrder} />
}
