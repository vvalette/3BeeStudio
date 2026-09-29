import { supabaseAdmin } from '@/lib/supabase'

/**
 * Numérotation des documents : `DEV-AAAA-NNN` pour les devis,
 * `FAC-AAAA-NNN` pour les factures. Remise à 001 chaque année.
 *
 * Le numéro n'est alloué qu'à l'émission — un devis préparé puis abandonné ne
 * doit pas trouer la séquence. L'unicité est garantie côté base (index partiel
 * de la migration 032 pour les devis, contrainte `unique` de la 034 pour les
 * factures) : en cas de collision, l'appelant réessaie et obtient le suivant.
 */

const PREFIX = 'DEV'

/**
 * Numéro suivant le plus grand déjà émis sous ce préfixe.
 *
 * Le maximum se calcule sur la valeur numérique, jamais par un tri de la base :
 * en texte, `…-1000` passe avant `…-999`, et la séquence resterait bloquée sur
 * 1000 dès le millième document de l'année. Les numéros qui ne se terminent pas
 * par un entier (référence saisie à la main sur un devis importé) sont ignorés.
 */
export function nextInSequence(prefix: string, numbers: Array<string | null>): string {
  let last = 0
  for (const n of numbers) {
    const tail = n?.startsWith(prefix) ? n.slice(prefix.length) : ''
    if (/^\d+$/.test(tail)) last = Math.max(last, Number(tail))
  }
  return `${prefix}${String(last + 1).padStart(3, '0')}`
}

export function quoteNumberPrefix(year = new Date().getFullYear()): string {
  return `${PREFIX}-${year}-`
}

/** Prochain numéro libre pour l'année en cours. */
export async function nextQuoteNumber(year = new Date().getFullYear()): Promise<string> {
  const prefix = quoteNumberPrefix(year)

  const { data, error } = await supabaseAdmin
    .from('custom_orders')
    .select('quote_number')
    .like('quote_number', `${prefix}%`)

  if (error) throw new Error(`Numérotation du devis indisponible : ${error.message}`)

  return nextInSequence(prefix, (data ?? []).map((r) => r.quote_number))
}

/** Vrai si l'erreur Supabase est la violation de l'unicité du numéro de devis. */
export function isQuoteNumberConflict(error: { code?: string; message?: string } | null): boolean {
  return error?.code === '23505' && (error.message ?? '').includes('quote_number')
}

/**
 * Prochain numéro de facture. La séquence est **commune à tous les flux**
 * (NFC, boutique, sur-mesure) : la comptabilité exige une numérotation continue
 * pour l'entreprise entière, pas une par canal de vente.
 */
export async function nextInvoiceNumber(year = new Date().getFullYear()): Promise<string> {
  const prefix = `FAC-${year}-`

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('number')
    .like('number', `${prefix}%`)

  if (error) throw new Error(`Numérotation de facture indisponible : ${error.message}`)

  return nextInSequence(prefix, (data ?? []).map((r) => r.number))
}

/** Vrai si l'erreur Supabase est une violation d'unicité sur les factures. */
export function isInvoiceConflict(error: { code?: string; message?: string } | null): boolean {
  return error?.code === '23505'
}
