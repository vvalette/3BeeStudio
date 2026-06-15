import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'

const schema = z.object({ email: z.string().email() })

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const parsed = schema.safeParse({ email: searchParams.get('email') })
  if (!parsed.success) return NextResponse.json({ hasDiscount: false })

  const { data } = await supabaseAdmin
    .from('newsletter_subscriptions')
    .select('id')
    .eq('email', parsed.data.email)
    .eq('promo_used', false)
    .maybeSingle()

  return NextResponse.json({ hasDiscount: data !== null })
}
