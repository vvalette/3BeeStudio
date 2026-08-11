import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { ShopProduct } from '@/types/shop-product'
import AdminBoutiqueProducts, { type OrderStat } from '@/components/admin/AdminBoutiqueProducts'

export const dynamic = 'force-dynamic'

export default async function AdminBoutiquePage() {
  if (!(await isAuthenticated())) redirect('/admin')

  // Les commandes ne sont plus listées ici (elles vivent sur /admin/commandes) :
  // seuls le CA et le nombre à traiter sont affichés, donc on ne rapatrie que
  // `status` et `total_amount` au lieu des lignes entières.
  const [{ data: products }, { data: orders }, { data: settingsData }] = await Promise.all([
    supabaseAdmin.from('shop_products').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('shop_orders').select('status, total_amount'),
    supabaseAdmin.from('shop_settings').select('key, value'),
  ])

  const settingsMap = Object.fromEntries(
    ((settingsData ?? []) as { key: string; value: string }[]).map((s) => [s.key, s.value])
  )
  const freeShipping = settingsMap.free_shipping === 'true'

  return (
    <AdminBoutiqueProducts
      products={(products ?? []) as ShopProduct[]}
      orderStats={(orders ?? []) as OrderStat[]}
      freeShipping={freeShipping}
    />
  )
}
