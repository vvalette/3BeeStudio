import { supabaseAdmin } from '@/lib/supabase'
import type { ShopOrder, ShopOrderDownload, PublicDownload } from '@/types/shop-order'

/**
 * Livraison des produits numériques.
 *
 * Bucket **privé** : contrairement à `stl-files` (public, qui alimente le viewer 3D
 * et reste donc extractible), rien ici n'est joignable sans passer par ce module.
 * L'accès se fait par URL signée à durée courte, générée après vérification du
 * paiement, avec un quota et une date d'expiration par fichier acheté.
 */
export const DIGITAL_BUCKET = 'stl-downloads'

/** Durée de vie du lien signé. Assez pour lancer le téléchargement, trop court pour se partager. */
export const SIGNED_URL_TTL_SECONDS = 120

/** Statuts pour lesquels le téléchargement est ouvert : le paiement doit être encaissé. */
const PAID_STATUSES: ShopOrder['status'][] = ['confirmed', 'processing', 'shipped', 'delivered']

export function isPaid(order: Pick<ShopOrder, 'status'>): boolean {
  return PAID_STATUSES.includes(order.status)
}

/**
 * Ouvre les droits de téléchargement d'une commande payée : une ligne par produit
 * numérique acheté.
 *
 * Idempotent grâce à l'index unique (order_id, product_id) — le webhook Stripe et
 * le fallback sync de la page de suivi peuvent tous deux gagner la course, et un
 * rejeu ne doit pas remettre les compteurs à zéro ni repousser l'expiration.
 *
 * Le chemin du fichier est **recopié** dans la ligne : si le produit est ensuite
 * supprimé ou son fichier remplacé, l'acheteur garde ce qu'il a payé.
 */
export async function grantDownloads(order: ShopOrder): Promise<number> {
  const digitalItems = (order.items ?? []).filter((i) => i.is_digital)
  if (digitalItems.length === 0) return 0

  const { data: products, error: productsError } = await supabaseAdmin
    .from('shop_products')
    .select('id, digital_file_path, digital_file_name, name')
    .in('id', digitalItems.map((i) => i.product_id))

  if (productsError) {
    console.error('[digital-delivery] lecture produits échouée:', productsError)
    return 0
  }

  const rows = (products ?? [])
    .filter((p) => p.digital_file_path)
    .map((p) => ({
      order_id:   order.id,
      product_id: p.id,
      file_path:  p.digital_file_path as string,
      file_name:  p.digital_file_name ?? `${p.name}.stl`,
    }))

  if (rows.length === 0) {
    // Produit numérique vendu sans fichier : la contrainte DB l'interdit à la
    // publication, donc on est sur un cas anormal qui mérite d'être visible.
    console.error('[digital-delivery] aucun fichier pour la commande', order.id)
    return 0
  }

  const { error } = await supabaseAdmin
    .from('shop_order_downloads')
    .upsert(rows, { onConflict: 'order_id,product_id', ignoreDuplicates: true })

  if (error) {
    console.error('[digital-delivery] ouverture des téléchargements échouée:', error)
    return 0
  }

  console.info('[digital-delivery]', JSON.stringify({ event: 'granted', orderId: order.id, files: rows.length }))
  return rows.length
}

/** Droits de téléchargement d'une commande, sans le chemin de stockage. */
export async function listDownloads(orderId: string): Promise<PublicDownload[]> {
  const { data, error } = await supabaseAdmin
    .from('shop_order_downloads')
    .select('id, order_id, product_id, file_name, download_count, max_downloads, expires_at, last_download_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[digital-delivery] lecture des téléchargements échouée:', error)
    return []
  }

  const now = Date.now()
  return (data ?? []).map((row) => {
    const d = row as ShopOrderDownload
    return {
      id: d.id,
      product_id: d.product_id,
      file_name: d.file_name,
      download_count: d.download_count,
      max_downloads: d.max_downloads,
      expires_at: d.expires_at,
      last_download_at: d.last_download_at,
      available: d.download_count < d.max_downloads && new Date(d.expires_at).getTime() > now,
    }
  })
}

/**
 * Consomme un téléchargement et renvoie une URL signée.
 *
 * Le quota et l'expiration sont tranchés **en base** par `claim_download`
 * (UPDATE ... WHERE atomique) : deux clics simultanés ne peuvent pas dépasser le
 * quota, là où une vérification applicative laisserait passer les deux.
 */
export async function claimDownload(
  downloadId: string,
  orderId: string,
): Promise<{ url: string; fileName: string; remaining: number } | { error: 'not_found' | 'exhausted' | 'storage' }> {
  // Le download doit appartenir à la commande demandée : sans ce contrôle, un id
  // de téléchargement deviné donnerait accès au fichier d'un autre acheteur.
  const { data: owned } = await supabaseAdmin
    .from('shop_order_downloads')
    .select('id')
    .eq('id', downloadId)
    .eq('order_id', orderId)
    .maybeSingle()

  if (!owned) return { error: 'not_found' }

  const { data, error } = await supabaseAdmin.rpc('claim_download', { p_download_id: downloadId })

  if (error) {
    console.error('[digital-delivery] claim_download a échoué:', error)
    return { error: 'storage' }
  }

  const claim = Array.isArray(data) ? data[0] : data
  if (!claim?.ok || !claim.file_path) return { error: 'exhausted' }

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from(DIGITAL_BUCKET)
    .createSignedUrl(claim.file_path, SIGNED_URL_TTL_SECONDS, { download: claim.file_name ?? true })

  if (signError || !signed?.signedUrl) {
    console.error('[digital-delivery] signature d’URL échouée:', signError)
    return { error: 'storage' }
  }

  return {
    url: signed.signedUrl,
    fileName: claim.file_name ?? 'modele.stl',
    remaining: claim.remaining ?? 0,
  }
}
