import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { addToNewsletterAudience, sendNewsletterWelcome } from '@/lib/resend'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Email invalide' }, { status: 400 })
  }

  const { email } = parsed.data

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
      sendNewsletterWelcome(email),
      addToNewsletterAudience(email),
    ])
  }

  return NextResponse.json({ ok: true })
}
