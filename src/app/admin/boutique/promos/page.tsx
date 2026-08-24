import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import type { PromoCode } from '@/types/promo'
import AdminPromoCodes, { type PromoUsage } from '@/components/admin/AdminPromoCodes'

export const dynamic = 'force-dynamic'

export default async function AdminPromosPage() {
  if (!(await isAuthenticated())) redirect('/admin')

  const [{ data: promos }, { data: uses }] = await Promise.all([
    supabaseAdmin.from('promo_codes').select('*').order('created_at', { ascending: false }),
    // Ce que chaque code a réellement coûté. PostgREST ne sait pas agréger :
    // les lignes sont additionnées ici, elles restent peu nombreuses.
    supabaseAdmin.from('promo_code_uses').select('promo_code_id, amount').limit(5000),
  ])

  const usage: Record<string, PromoUsage> = {}
  for (const u of uses ?? []) {
    const entry = usage[u.promo_code_id] ?? { count: 0, amount: 0 }
    entry.count  += 1
    entry.amount += u.amount
    usage[u.promo_code_id] = entry
  }

  return <AdminPromoCodes promos={(promos ?? []) as PromoCode[]} usage={usage} />
}
