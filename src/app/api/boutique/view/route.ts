import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { isAuthenticated } from '@/lib/auth'
import { isBotUserAgent, visitorHash } from '@/lib/product-stats.server'

/**
 * Compteur d'audience des fiches produit (voir migration 036).
 *
 * Appelé en `sendBeacon` depuis la fiche produit : la page est en ISR
 * (revalidate = 3600), donc le rendu serveur ne voit qu'une visite sur des
 * centaines — seul le navigateur peut compter juste.
 *
 * Réponse toujours 204, même quand la visite n'est pas comptée : le client n'a
 * rien à faire de la réponse, et un beacon n'a de toute façon aucun moyen de
 * réagir à une erreur.
 */

const NO_CONTENT = new NextResponse(null, { status: 204 })

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: Request) {
  const userAgent = req.headers.get('user-agent')
  if (isBotUserAgent(userAgent)) return NO_CONTENT

  // Les visites depuis la session admin ne comptent pas : à faible trafic, ouvrir
  // ses propres fiches pour les relire fausserait complètement les chiffres.
  if (await isAuthenticated()) return NO_CONTENT

  const ip = getClientIp(req)

  // 60 événements / 5 min / IP : très au-delà d'une navigation humaine, assez bas
  // pour qu'un script ne puisse pas gonfler les compteurs d'un produit.
  const { ok } = await rateLimit(`product-view:${ip}`, 60, 5 * 60 * 1000)
  if (!ok) return NO_CONTENT

  const body = await req.json().catch(() => null)
  const productId = typeof body?.productId === 'string' ? body.productId : null
  const event = body?.event === 'cart' ? 'cart' : 'view'

  if (!productId || !UUID_RE.test(productId)) return NO_CONTENT

  const { error } = await supabaseAdmin.rpc('record_product_event', {
    p_product_id:   productId,
    p_visitor_hash: visitorHash(ip, userAgent ?? ''),
    p_event:        event,
  })

  // Cas normal d'échec : un id de produit qui n'existe pas (clé étrangère). On le
  // journalise sans bruit — l'audience n'est pas une donnée critique.
  if (error) console.warn('[boutique/view]', error.message)

  return NO_CONTENT
}
