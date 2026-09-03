import { supabaseAdmin } from '@/lib/supabase'

/**
 * Devis importés : le PDF a été fabriqué ailleurs (traitement de texte, outil
 * de devis) et téléversé par l'admin, qui l'envoie tel quel au client.
 *
 * Contrairement au devis composé dans l'app, qui se reconstruit à l'identique
 * depuis les colonnes `quote_*`, ce fichier-là n'existe qu'une fois : il faut
 * donc le stocker. Bucket **privé** — un devis porte le nom, les prix et
 * parfois l'adresse du client, rien n'en sort sans passer par la route admin
 * authentifiée `/api/admin/custom/[orderId]/quote-pdf`.
 */
export const QUOTE_BUCKET = 'quotes'

/** Un devis PDF pèse quelques centaines de Ko ; au-delà, c'est une erreur de fichier. */
export const MAX_QUOTE_PDF_SIZE = 10 * 1024 * 1024 // 10 Mo

/**
 * Nom d'origine ramené à quelque chose qu'on peut poser dans un `Content-Disposition`
 * et dans une pièce jointe : sans accent, sans espace, toujours en `.pdf`.
 */
export function safeQuoteFileName(name: string): string {
  const base = name
    .replace(/\.pdf$/i, '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._]+/, '')
    .replace(/_+$/, '')
    .slice(0, 100)
  return `${base || 'Devis'}.pdf`
}

/** Le chemin porte l'id de la demande : les devis d'une commande restent groupés. */
export function quoteStoragePath(orderId: string): string {
  return `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`
}

/** Téléverse le PDF et renvoie son chemin dans le bucket. */
export async function uploadQuotePdf(orderId: string, file: File): Promise<string> {
  const path = quoteStoragePath(orderId)
  const { error } = await supabaseAdmin.storage
    .from(QUOTE_BUCKET)
    .upload(path, file, { contentType: 'application/pdf', upsert: false })

  if (error) throw new Error(`Téléversement du devis impossible : ${error.message}`)
  return path
}

/** Octets du PDF stocké — pièce jointe de l'email, aperçu admin. */
export async function downloadQuotePdf(path: string): Promise<Buffer> {
  const { data, error } = await supabaseAdmin.storage.from(QUOTE_BUCKET).download(path)
  if (error || !data) {
    throw new Error(`Devis importé introuvable dans le stockage : ${error?.message ?? 'aucun fichier'}`)
  }
  return Buffer.from(await data.arrayBuffer())
}

/**
 * Supprime un fichier devenu inutile (remplacé ou retiré). L'échec n'est pas
 * bloquant : un fichier orphelin coûte moins cher qu'une action admin en erreur.
 */
export async function removeQuotePdf(path: string | null | undefined): Promise<void> {
  if (!path) return
  const { error } = await supabaseAdmin.storage.from(QUOTE_BUCKET).remove([path])
  if (error) console.error('[quote-file] suppression échouée:', error.message)
}
