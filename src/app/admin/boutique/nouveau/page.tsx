import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { ShopCategoryRow } from '@/types/shop-category'
import AdminBoutiqueProductForm from '@/components/admin/AdminBoutiqueProductForm'

export const dynamic = 'force-dynamic'

export default async function AdminBoutiqueNouveauPage() {
  if (!(await isAuthenticated())) redirect('/admin')

  const { data: catsData } = await supabaseAdmin
    .from('shop_categories')
    .select('*')
    .order('sort_order')
    .order('created_at')

  return <AdminBoutiqueProductForm initialCategories={(catsData ?? []) as ShopCategoryRow[]} />
}
