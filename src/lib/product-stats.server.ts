import { createHash } from 'crypto'
import { parisDay } from './product-stats'

/**
 * Partie serveur de la mesure d'audience : identification anonyme du visiteur et
 * filtrage des robots. Séparée de `product-stats.ts` parce que ce module importe
 * `crypto` — un import Node interdit dans un composant client, or l'agrégation,
 * elle, est partagée avec l'admin.
 */

/**
 * Empreinte non réversible et non persistante d'un visiteur, pour ne pas compter
 * deux fois la même personne dans les « uniques » du jour.
 *
 * Le sel contient le jour : l'empreinte change à minuit, donc elle ne permet pas
 * de suivre quelqu'un d'un jour à l'autre. Aucune IP n'est stockée, et le sel
 * secret empêche de retrouver une IP par force brute (l'espace IPv4 se balaie en
 * quelques minutes sur un hash non salé).
 */
export function visitorHash(ip: string, userAgent: string, day: string = parisDay()): string {
  const secret = process.env.ANALYTICS_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dev-salt'
  return createHash('sha256').update(`${day}|${secret}|${ip}|${userAgent}`).digest('hex').slice(0, 32)
}

// Robots, moniteurs et prefetchers d'aperçu (Slack, WhatsApp…) : ils chargent la
// page sans intention d'achat et gonfleraient les vues d'un produit partagé.
const BOT_RE =
  /bot|crawl|spider|slurp|bing|yandex|baidu|duckduck|facebookexternalhit|whatsapp|telegram|discord|preview|lighthouse|headless|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|semrush|ahrefs|screaming|vercel-screenshot/i

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  // Un navigateur envoie toujours un User-Agent : son absence est un script.
  if (!userAgent || userAgent.trim().length < 10) return true
  return BOT_RE.test(userAgent)
}
