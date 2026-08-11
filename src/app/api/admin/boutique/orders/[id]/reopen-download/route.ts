import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { z } from 'zod'

/**
 * Réouvre l'accès à un fichier acheté : compteur remis à zéro et expiration
 * repoussée de 30 jours.
 *
 * Sans ça, un client qui a épuisé ses 10 téléchargements ou dépassé les 30 jours
 * n'avait aucun recours que le remboursement — alors qu'il a payé et que le motif
 * est souvent trivial (disque plein, mauvais appareil, mail perdu).
 *
 * On ne recrée pas la ligne et on ne touche pas au `file_path` : l'acheteur
 * récupère exactement le fichier qu'il a payé, même si le produit a changé depuis.
 */

const EXTRA_DAYS = 30

const schema = z.object({ download_id: z.string().uuid() })

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated()))
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id: orderId } = await params
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success)
    return NextResponse.json({ error: 'Identifiant de téléchargement invalide' }, { status: 400 })

  // Le `.eq('order_id')` empêche de réouvrir par erreur le fichier d'une autre
  // commande depuis la fiche ouverte à l'écran.
  const { data, error } = await supabaseAdmin
    .from('shop_order_downloads')
    .update({
      download_count: 0,
      expires_at: new Date(Date.now() + EXTRA_DAYS * 24 * 3600 * 1000).toISOString(),
    })
    .eq('id', parsed.data.download_id)
    .eq('order_id', orderId)
    .select('id, file_name, download_count, max_downloads, expires_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Téléchargement introuvable pour cette commande' }, { status: 404 })

  console.info('[admin] réouverture téléchargement', JSON.stringify({ orderId, downloadId: data.id }))
  return NextResponse.json(data)
}
