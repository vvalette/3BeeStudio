import { redirect, notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { ShopProduct } from '@/types/shop-product'
import type { ShopCategoryRow } from '@/types/shop-category'
import AdminBoutiqueProductForm from '@/components/admin/AdminBoutiqueProductForm'

export const dynamic = 'force-dynamic'

export default async function AdminBoutiqueEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (!(await isAuthenticated())) redirect('/admin')

  const { id } = await params
  const [{ data, error }, { data: catsData }] = await Promise.all([
    supabaseAdmin.from('shop_products').select('*').eq('id', id).single(),
    supabaseAdmin.from('shop_categories').select('*').order('sort_order').order('created_at'),
  ])

  if (error || !data) notFound()

  return (
    <AdminBoutiqueProductForm
      product={data as ShopProduct}
      initialCategories={(catsData ?? []) as ShopCategoryRow[]}
    />
  )
}
