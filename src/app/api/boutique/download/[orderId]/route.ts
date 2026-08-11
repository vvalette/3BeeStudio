import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { claimDownload, isPaid } from '@/lib/digital-delivery'
import type { ShopOrder } from '@/types/shop-order'

/**
 * Téléchargement d'un fichier acheté.
 *
 * `GET /api/boutique/download/[orderId]?file=<downloadId>`
 *
 * Il n'y a pas de compte client sur le site : la connaissance de l'UUID de
 * commande fait office d'authentification, comme pour la page de suivi
 * `/boutique/suivi/[orderId]`. C'est pour ça que le fichier n'est jamais servi
 * directement — chaque accès consomme un jeton du quota et passe par une URL
 * signée de 2 minutes, ce qui rend un lien partagé rapidement inutile.
 *
 * Réponse : redirection 302 vers l'URL signée Supabase.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params
  const downloadId = new URL(req.url).searchParams.get('file')

  if (!downloadId)
    return NextResponse.json({ error: 'Fichier non précisé' }, { status: 400 })

  // Anti-énumération : l'UUID de commande est le seul secret, on limite les essais.
  const ip = getClientIp(req)
  const { ok, retryAfter } = await rateLimit(`download:${ip}`, 30, 10 * 60 * 1000)
  if (!ok)
    return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez dans quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )

  const { data: raw, error } = await supabaseAdmin
    .from('shop_orders')
    .select('id, status')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !raw)
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  // Le paiement doit être encaissé : une commande abandonnée en pending_payment ne
  // doit pas ouvrir le fichier.
  if (!isPaid(raw as Pick<ShopOrder, 'status'>))
    return NextResponse.json({ error: 'Paiement non confirmé' }, { status: 403 })

  const result = await claimDownload(downloadId, orderId)

  if ('error' in result) {
    const { status, message } = {
      not_found: { status: 404, message: 'Téléchargement introuvable' },
      exhausted: { status: 410, message: 'Lien expiré ou nombre de téléchargements atteint. Contactez-nous à contact@3beestudio.fr.' },
      storage:   { status: 500, message: 'Fichier momentanément indisponible' },
    }[result.error]
    return NextResponse.json({ error: message }, { status })
  }

  console.info('[download]', JSON.stringify({
    orderId, downloadId, remaining: result.remaining,
  }))

  // 302 et non 307 : le navigateur suit la redirection en GET vers Supabase, qui
  // renvoie le fichier avec un Content-Disposition d'attachement.
  return NextResponse.redirect(result.url, {
    status: 302,
    headers: { 'Cache-Control': 'no-store' },
  })
}
