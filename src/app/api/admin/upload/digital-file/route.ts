import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { DIGITAL_BUCKET } from '@/lib/digital-delivery'

const MAX_SIZE = 100 * 1024 * 1024 // 100 Mo — un STL détaillé dépasse vite 50 Mo

/**
 * Upload du fichier **vendu** d'un produit numérique, vers le bucket PRIVÉ.
 *
 * Différence essentielle avec /api/admin/upload/stl : cette route ne renvoie
 * **jamais** d'URL publique, seulement un chemin de stockage. Le fichier n'est
 * servi qu'à travers /api/boutique/download/[orderId], par URL signée courte,
 * après vérification du paiement.
 *
 * On accepte plus large que STL/3MF : un modèle se vend souvent en archive
 * (plusieurs variantes, profil d'impression, notice).
 */
const ALLOWED_EXT = ['stl', '3mf', 'zip', 'step', 'stp', 'obj'] as const

const MIME: Record<string, string> = {
  stl:  'model/stl',
  '3mf': 'model/3mf',
  zip:  'application/zip',
  step: 'application/step',
  stp:  'application/step',
  obj:  'model/obj',
}

export async function POST(req: Request) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file)
    return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'Fichier trop lourd (max 100 Mo)' }, { status: 400 })

  const ext = file.name.toLowerCase().split('.').pop() ?? ''
  if (!(ALLOWED_EXT as readonly string[]).includes(ext))
    return NextResponse.json(
      { error: `Format non accepté. Autorisés : ${ALLOWED_EXT.join(', ')}` },
      { status: 400 },
    )

  // Nom de stockage aléatoire : le nom d'origine est conservé séparément pour être
  // restitué au téléchargement, mais ne doit pas se retrouver dans le chemin
  // (il fuiterait dans les logs et rendrait les chemins devinables).
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from(DIGITAL_BUCKET)
    .upload(storagePath, file, { contentType: MIME[ext] ?? 'application/octet-stream', upsert: false })

  if (error) {
    // Message explicite : l'oubli le plus probable est que le bucket privé n'a pas
    // encore été créé à la main dans le dashboard Supabase (cf. migration 030).
    const hint = /not found|does not exist/i.test(error.message)
      ? ` — le bucket privé « ${DIGITAL_BUCKET} » existe-t-il dans Supabase Storage ?`
      : ''
    return NextResponse.json({ error: error.message + hint }, { status: 500 })
  }

  return NextResponse.json({
    path: storagePath,
    name: file.name,
    size: file.size,
  })
}
