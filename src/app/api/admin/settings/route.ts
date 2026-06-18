import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  free_shipping: z.boolean().optional(),
})

export async function GET() {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data } = await supabaseAdmin.from('shop_settings').select('key, value')
  const map = Object.fromEntries((data ?? []).map((s: { key: string; value: string }) => [s.key, s.value]))

  return NextResponse.json({
    free_shipping: map.free_shipping === 'true',
  })
}

export async function PUT(req: Request) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })

  const d = parsed.data

  if (d.free_shipping !== undefined) {
    await supabaseAdmin.from('shop_settings').upsert({
      key: 'free_shipping',
      value: d.free_shipping ? 'true' : 'false',
    })
  }

  return NextResponse.json({ success: true })
}
