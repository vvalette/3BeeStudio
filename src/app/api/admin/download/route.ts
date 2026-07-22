import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'

// Permet de retélécharger un fichier Supabase Storage (photo produit, STL)
// depuis l'admin, même si l'admin ne l'a plus en local.
const ALLOWED_BUCKETS = ['product-images', 'stl-files']

export async function GET(req: Request) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const url = new URL(req.url).searchParams.get('url')
  if (!url)
    return NextResponse.json({ error: 'Paramètre url manquant' }, { status: 400 })

  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  if (!match)
    return NextResponse.json({ error: 'URL invalide' }, { status: 400 })

  const [, bucket, rawPath] = match
  if (!ALLOWED_BUCKETS.includes(bucket))
    return NextResponse.json({ error: 'Bucket non autorisé' }, { status: 400 })

  const path = decodeURIComponent(rawPath)
  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path)

  if (error || !data)
    return NextResponse.json({ error: error?.message ?? 'Fichier introuvable' }, { status: 404 })

  const filename = path.split('/').pop() ?? 'fichier'
  const buffer = Buffer.from(await data.arrayBuffer())

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.length),
    },
  })
}
