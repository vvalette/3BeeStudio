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
    .order('quote_number', { ascending: false })
    .limit(1)

  if (error) throw new Error(`Numérotation du devis indisponible : ${error.message}`)

  const last = data?.[0]?.quote_number
  const lastIndex = last ? Number.parseInt(last.slice(prefix.length), 10) : 0
  const next = Number.isFinite(lastIndex) ? lastIndex + 1 : 1

  return `${prefix}${String(next).padStart(3, '0')}`
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
    .order('number', { ascending: false })
    .limit(1)

  if (error) throw new Error(`Numérotation de facture indisponible : ${error.message}`)

  const last = data?.[0]?.number
  const lastIndex = last ? Number.parseInt(last.slice(prefix.length), 10) : 0
  const next = Number.isFinite(lastIndex) ? lastIndex + 1 : 1

  return `${prefix}${String(next).padStart(3, '0')}`
}

/** Vrai si l'erreur Supabase est une violation d'unicité sur les factures. */
export function isInvoiceConflict(error: { code?: string; message?: string } | null): boolean {
  return error?.code === '23505'
}
