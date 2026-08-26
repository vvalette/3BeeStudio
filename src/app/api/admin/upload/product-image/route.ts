import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'

const ALLOWED: Record<string, string> = {
  'image/jpeg':  'jpg',
  'image/jpg':   'jpg',
  'image/png':   'png',
  'image/webp':  'webp',
  'image/avif':  'avif',
  'image/heic':  'jpg',
  'image/heif':  'jpg',
}

const MAX_SIZE = 5 * 1024 * 1024 // 5 Mo

export async function POST(req: Request) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file)
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'Fichier trop lourd (max 5 Mo)' }, { status: 400 })

  const ext = ALLOWED[file.type]
  if (!ext)
    return NextResponse.json({ error: 'Format non accepté (JPG, PNG, WebP, AVIF)' }, { status: 400 })

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from('product-images')
    .upload(filename, file, {
      contentType: file.type,
      upsert: false,
      // Le nom du fichier est unique et jamais réécrit : l'image est immuable.
      // Sans ça Supabase renvoie max-age=3600 et l'optimiseur Vercel refacture
      // une transformation par variante et par heure.
      cacheControl: '31536000',
    })

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabaseAdmin.storage.from('product-images').getPublicUrl(filename)

  return NextResponse.json({ url: data.publicUrl })
}
