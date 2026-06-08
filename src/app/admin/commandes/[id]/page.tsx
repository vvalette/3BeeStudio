import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import type { Order } from '@/types/order'
import AdminOrderDetail from '@/components/admin/AdminOrderDetail'

export const dynamic = 'force-dynamic'

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get('admin_token')?.value
  if (token !== process.env.ADMIN_PASSWORD) redirect('/admin')

  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  return <AdminOrderDetail order={data as Order} />
}
