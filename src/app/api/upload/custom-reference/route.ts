import { supabaseAdmin } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

// Extensions interdites (exécutables, scripts, contenu pouvant s'exécuter dans un navigateur)
const BLOCKED_EXT = new Set([
  'html', 'htm', 'svg', 'js', 'mjs', 'cjs', 'exe', 'bat', 'cmd', 'sh',
  'php', 'apk', 'msi', 'dll', 'jar', 'ps1', 'vbs', 'scr', 'com', 'app',
])

const MAX_SIZE = 20 * 1024 * 1024 // 20 Mo

export async function POST(req: Request) {
  // Limite : 10 uploads / 10 min / IP (endpoint public)
  const ip = getClientIp(req)
  const { ok, retryAfter } = await rateLimit(`upload-custom-reference:${ip}`, 10, 10 * 60 * 1000)
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

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop lourd (max 20 Mo)' }, { status: 400 })
  }

  const rawExt = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
  const ext = rawExt.replace(/[^a-z0-9]/g, '')

  if (!ext || BLOCKED_EXT.has(ext)) {
    return NextResponse.json({ error: 'Ce type de fichier n\'est pas accepté' }, { status: 400 })
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from('custom-references')
    .upload(filename, file, { contentType: file.type || 'application/octet-stream', upsert: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = supabaseAdmin.storage.from('custom-references').getPublicUrl(filename)

  return NextResponse.json({ url: data.publicUrl })
}
