import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { DIGITAL_BUCKET } from '@/lib/digital-delivery'
import { z } from 'zod'

/**
 * Délivre une **URL d'upload signée** pour le fichier vendu d'un produit numérique.
 *
 * Le fichier ne transite PAS par cette route : le navigateur l'envoie directement
 * à Supabase Storage. La première version recevait le fichier en `FormData` et
 * marchait en local, mais la limite de taille de requête de la plateforme la
 * rejetait en production dès quelques Mo — un STL de 18 Mo revenait en
 * « Request Entity Too Large » avant même d'atteindre le code, ce qui rendait
 * impossible la création d'un produit numérique depuis l'admin.
 *
 * L'URL signée n'autorise l'écriture que d'UN chemin précis dans le bucket privé,
 * et seul un admin authentifié peut en obtenir une. Le fichier reste inaccessible
 * publiquement : il n'est servi qu'après paiement, par URL de lecture signée
 * (cf. /api/boutique/download/[orderId]).
 */

/** On accepte plus large que STL/3MF : un modèle se vend souvent en archive. */
const ALLOWED_EXT = ['stl', '3mf', 'zip', 'step', 'stp', 'obj'] as const

// Garde-fou applicatif. Le bucket n'a pas de `file_size_limit` propre, c'est donc
// la limite globale du projet Supabase qui tranche réellement côté serveur.
const MAX_SIZE = 200 * 1024 * 1024 // 200 Mo

const schema = z.object({
  filename: z.string().min(1).max(300),
  size:     z.number().int().positive().max(MAX_SIZE),
})

export async function POST(req: Request) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json(
      { error: `Requête invalide (fichier de plus de ${MAX_SIZE / 1024 / 1024} Mo ?)` },
      { status: 400 },
    )

  const { filename, size } = parsed.data
  const ext = filename.toLowerCase().split('.').pop() ?? ''
  if (!(ALLOWED_EXT as readonly string[]).includes(ext))
    return NextResponse.json(
      { error: `Format non accepté. Autorisés : ${ALLOWED_EXT.join(', ')}` },
      { status: 400 },
    )

  // Chemin de stockage aléatoire : le nom d'origine est conservé à part pour être
  // restitué au téléchargement, mais ne doit pas rendre les chemins devinables.
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabaseAdmin.storage
    .from(DIGITAL_BUCKET)
    .createSignedUploadUrl(path)

  if (error || !data?.signedUrl) {
    // L'oubli le plus probable : le bucket privé n'existe pas encore.
    const hint = /not found|does not exist/i.test(error?.message ?? '')
      ? ` — le bucket privé « ${DIGITAL_BUCKET} » existe-t-il dans Supabase Storage ?`
      : ''
    return NextResponse.json({ error: (error?.message ?? 'Signature impossible') + hint }, { status: 500 })
  }

  return NextResponse.json({
    uploadUrl: data.signedUrl,
    path,
    name: filename,
    size,
  })
}
