import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { ShopProduct } from '@/types/shop-product'
import AdminBoutiqueProductForm from '@/components/admin/AdminBoutiqueProductForm'

export const dynamic = 'force-dynamic'

export default async function AdminBoutiqueEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (!(await isAuthenticated())) redirect('/admin')

  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('shop_products')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  return <AdminBoutiqueProductForm product={data as ShopProduct} />
}
