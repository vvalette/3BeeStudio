import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { ShopProduct } from '@/types/shop-product'
import type { ShopOrder } from '@/types/shop-order'
import AdminBoutiqueProducts from '@/components/admin/AdminBoutiqueProducts'

export const dynamic = 'force-dynamic'

export default async function AdminBoutiquePage() {
  if (!(await isAuthenticated())) redirect('/admin')

  const [{ data: products }, { data: orders }] = await Promise.all([
    supabaseAdmin.from('shop_products').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('shop_orders').select('*').order('created_at', { ascending: false }),
  ])

  return (
    <AdminBoutiqueProducts
      products={(products ?? []) as ShopProduct[]}
      orders={(orders ?? []) as ShopOrder[]}
    />
  )
}
