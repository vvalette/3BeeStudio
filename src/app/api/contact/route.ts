import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sendContactMessage } from '@/lib/resend'

const schema = z.object({
  name:    z.string().min(2).max(100),
  email:   z.string().email().max(200),
  subject: z.string().max(150).optional(),
  message: z.string().min(10).max(5000),
  // Honeypot anti-spam : champ invisible pour un humain — un bot qui le remplit est ignoré.
  website: z.string().max(0).optional().or(z.literal('')),
})

export async function POST(req: Request) {
  // Limite : 5 messages / 10 min / IP (endpoint public)
  const ip = getClientIp(req)
  const { ok, retryAfter } = await rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000)
  if (!ok) {
    return NextResponse.json(
      { error: 'Trop de messages. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
    }

    const d = parsed.data

    // Honeypot rempli → on répond OK sans rien envoyer (ne pas aider le bot à se corriger)
    if (d.website) return NextResponse.json({ ok: true })

    await sendContactMessage({
      name:    d.name,
      email:   d.email,
      subject: d.subject?.trim() || 'Message depuis le site',
      message: d.message,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[contact] Erreur envoi:', err)
    return NextResponse.json({ error: 'Erreur lors de l\'envoi du message' }, { status: 500 })
  }
}
