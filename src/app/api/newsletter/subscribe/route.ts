import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { addToNewsletterAudience, sendNewsletterWelcome } from '@/lib/resend'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const schema = z.object({
  email:  z.string().email(),
  locale: z.enum(['fr', 'en']).optional().default('fr'),
})

export async function POST(req: Request) {
  // Anti abus (email-bombing) : 5 inscriptions / h / IP
  const ip = getClientIp(req)
  const { ok, retryAfter } = rateLimit(`newsletter-subscribe:${ip}`, 5, 60 * 60 * 1000)
  if (!ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const { email, locale } = parsed.data

  // Upsert : si l'email existe déjà, on ne renvoie pas d'erreur (double inscription silencieuse)
  const { error: dbError, data: rows } = await supabaseAdmin
    .from('newsletter_subscriptions')
    .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })
    .select('id, promo_used')

  if (dbError) {
    console.error('[newsletter] DB error:', dbError.message)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  const isNew = rows && rows.length > 0

  // Pour un nouvel abonné uniquement : email de bienvenue + ajout audience Resend
  if (isNew) {
    await Promise.allSettled([
      sendNewsletterWelcome(email, locale),
      addToNewsletterAudience(email),
    ])
  }

  return NextResponse.json({ ok: true })
}
