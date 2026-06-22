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

  // Vérifier l'extension (les MIME types de ces formats 3D ne sont pas standardisés)
  const name = file.name.toLowerCase()
  const is3mf = name.endsWith('.3mf')
  const isStl = name.endsWith('.stl')
  if (!isStl && !is3mf)
    return NextResponse.json({ error: 'Seuls les formats STL et 3MF sont acceptés' }, { status: 400 })

  const ext      = is3mf ? '3mf' : 'stl'
  const mimeType = is3mf ? 'model/3mf' : 'model/stl'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from('stl-files')
    .upload(filename, file, { contentType: mimeType, upsert: false })

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = supabaseAdmin.storage.from('stl-files').getPublicUrl(filename)

  return NextResponse.json({ url: data.publicUrl })
}
