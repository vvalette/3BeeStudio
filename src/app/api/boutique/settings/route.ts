import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('shop_settings')
    .select('key, value')

  const map = Object.fromEntries((data ?? []).map((s: { key: string; value: string }) => [s.key, s.value]))

  return NextResponse.json({
    free_shipping: map.free_shipping === 'true',
  })
}
