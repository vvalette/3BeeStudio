import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// Minuscules, comme à l'inscription : sinon `Jean@` ne retrouverait pas `jean@`.
const schema = z.object({ email: z.string().trim().toLowerCase().email() })

export async function GET(req: Request) {
  // Anti énumération d'abonnés : 20 requêtes / 10 min / IP
  const ip = getClientIp(req)
  const { ok, retryAfter } = await rateLimit(`newsletter-check:${ip}`, 20, 10 * 60 * 1000)
  if (!ok) {
    return NextResponse.json(
      { hasDiscount: false },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

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
