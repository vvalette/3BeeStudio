import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'

const MAX_SIZE = 50 * 1024 * 1024 // 50 Mo

export async function POST(req: Request) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file)
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'Fichier trop lourd (max 50 Mo)' }, { status: 400 })

  // Vérifier l'extension (le MIME type des .stl n'est pas standardisé)
  const name = file.name.toLowerCase()
  if (!name.endsWith('.stl'))
    return NextResponse.json({ error: 'Seul le format STL est accepté' }, { status: 400 })

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.stl`

  const { error } = await supabaseAdmin.storage
    .from('stl-files')
    .upload(filename, file, { contentType: 'model/stl', upsert: false })

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabaseAdmin.storage.from('stl-files').getPublicUrl(filename)

  return NextResponse.json({ url: data.publicUrl })
}
