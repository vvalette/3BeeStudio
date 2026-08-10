/**
 * Résout les infos de suivi affichables côté client.
 *
 * Deux cas réels à absorber :
 *  - `tracking_url` renseignée par le webhook Boxtal → lien direct.
 *  - `tracking_number` contenant en fait une URL : l'admin n'expose qu'un seul
 *    champ « Numéro de suivi », et une étiquette posée à la main (hors Boxtal)
 *    s'y retrouve souvent sous forme de lien transporteur complet. Sans ça la
 *    page suivi affichait « Suivi : https://… » en texte brut non cliquable.
 *
 * Seuls http/https sont acceptés comme href — la valeur vient d'un champ admin
 * libre, un `javascript:` ne doit jamais finir dans un attribut href.
 */
export function resolveTracking(
  trackingUrl: string | null | undefined,
  trackingNumber: string | null | undefined,
): { href: string | null; number: string | null } {
  const url    = trackingUrl?.trim() || null
  const number = trackingNumber?.trim() || null

  const href = safeHttpUrl(url) ?? safeHttpUrl(number)

  return {
    href,
    // Si le « numéro » est en fait l'URL déjà utilisée comme href, ne pas
    // le répéter en texte brut sous le bouton.
    number: number && number !== href ? number : null,
  }
}

function safeHttpUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? value : null
  } catch {
    return null
  }
}

/** Y a-t-il quelque chose de suivi à montrer au client ? */
export function hasTracking(
  trackingUrl: string | null | undefined,
  trackingNumber: string | null | undefined,
): boolean {
  const { href, number } = resolveTracking(trackingUrl, trackingNumber)
  return Boolean(href || number)
}
