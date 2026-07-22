import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const ALLOWED: Record<string, string> = {
  'image/svg+xml': 'svg',
}

export async function POST(req: Request) {
  // Limite : 10 uploads / 10 min / IP (endpoint public)
  const ip = getClientIp(req)
  const { ok, retryAfter } = await rateLimit(`upload-logo:${ip}`, 10, 10 * 60 * 1000)
  if (!ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'Fichier trop lourd (max 2 Mo)' }, { status: 400 })
  }

  const ext = ALLOWED[file.type]
  if (!ext) {
    return NextResponse.json({ error: 'Seul le format SVG est accepté' }, { status: 400 })
  }

  // Sécurité : rejeter les SVG contenant des vecteurs XSS courants.
  // Origine Supabase Storage isolée de 3beestudio.fr = mitigation supplémentaire (pas de cookie/session
  // à voler côté origine du bucket), mais cette allowlist reste la première ligne de défense.
  const text = await file.text()
  const dangerous =
    /<script[\s>]/i.test(text) ||
    /javascript:/i.test(text) ||
    /on\w+\s*=/i.test(text) ||
    /<foreignObject/i.test(text) ||
    /<use[\s>]/i.test(text) ||
    /xlink:href\s*=/i.test(text) ||
    /\bhref\s*=/i.test(text) ||
    /<animate/i.test(text) ||
    /<set[\s>]/i.test(text) ||
    /<style[\s>]/i.test(text)
  if (dangerous) {
    return NextResponse.json({ error: 'SVG non conforme (contenu interdit détecté)' }, { status: 400 })
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from('logos')
    .upload(filename, file, { contentType: file.type, upsert: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = supabaseAdmin.storage.from('logos').getPublicUrl(filename)

  return NextResponse.json({ url: data.publicUrl })
}
