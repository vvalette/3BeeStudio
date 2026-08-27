import { supabaseAdmin } from '@/lib/supabase'
import { buildDocumentPdf, quoteTotal, type DocumentAdjustment, type DocumentRecipient } from './pdf'
import { nextInvoiceNumber, isInvoiceConflict } from './number'
import { fallbackQuoteItems, fallbackQuoteObject, projectLabel } from './input'
import { getShipping, type Order } from '@/types/order'
import type { ShopOrder } from '@/types/shop-order'
import type { CustomOrder, QuoteLineItem } from '@/types/custom-order'
import { discountLabel } from '@/lib/promo'

/**
 * Facturation, tous flux confondus.
 *
 * Les trois tables de commandes n'ont pas la même forme : le NFC porte une
 * quantité et un prix unitaire, la boutique une liste d'articles, le sur-mesure
 * les lignes de son devis. On les ramène ici à une forme commune, puis on fige
 * le résultat dans `invoices` — une facture réémise plus tard doit être
 * identique à celle qui est partie, même si la commande a bougé depuis.
 */

export type InvoiceSource = 'nfc' | 'shop' | 'custom'

export interface InvoiceRecord {
  number: string
  issued_at: string
  paid_at: string | null
  source: InvoiceSource
  order_id: string
  client_name: string
  client_company: string | null
  client_email: string
  client_address: string | null
  client_postal_code: string | null
  client_city: string | null
  object: string
  items: QuoteLineItem[]
  adjustments: DocumentAdjustment[]
  total_amount: number
}

/** Forme commune extraite d'une commande, avant numérotation. */
interface InvoiceDraft {
  recipient: DocumentRecipient
  object: string
  items: QuoteLineItem[]
  adjustments: DocumentAdjustment[]
  /** Montant réellement encaissé — fait foi. */
  totalPaid: number
  paidAt: Date | null
}

function draftFromNfc(order: Order): InvoiceDraft {
  return {
    recipient: {
      name: order.shipping_name ?? order.company,
      company: order.company,
      email: order.email,
      phone: order.phone,
      address: [order.shipping_address, order.shipping_address2].filter(Boolean).join(', ') || null,
      postalCode: order.shipping_postal_code,
      city: order.shipping_city,
    },
    object: `Porte-clés NFC personnalisés — ${order.quantity} pièces`,
    items: [{
      label: 'Porte-clé NFC personnalisé',
      detail: 'Impression 3D, puce NTAG programmée et logo appliqué à la main',
      quantity: order.quantity,
      unit_price: order.unit_price,
    }],
    adjustments: [{ label: 'Livraison', amount: getShipping(order.quantity) }],
    totalPaid: order.total_amount,
    paidAt: new Date(order.created_at),
  }
}

function draftFromShop(order: ShopOrder): InvoiceDraft {
  const items: QuoteLineItem[] = (order.items ?? []).map((item) => ({
    label: item.product_name,
    // Le coloris distingue deux lignes du même produit sur la facture : sans lui
    // elles seraient rigoureusement identiques.
    detail: [
      ...(item.color ? [`Coloris : ${item.color.label}`] : []),
      ...(item.custom_field_values ?? []).map((f) => `${f.label} : ${f.value}`),
    ].join('\n') || undefined,
    quantity: item.quantity,
    unit_price: item.unit_price,
  }))

  const adjustments: DocumentAdjustment[] = []
  if (order.discount_amount > 0) {
    adjustments.push({ label: discountLabel(order), amount: -order.discount_amount })
  }
  // Une commande de fichiers n'a pas de port, pas même à zéro.
  if (order.delivery_mode !== 'digital') {
    adjustments.push({ label: 'Livraison', amount: order.shipping })
  }

  return {
    recipient: {
      name: order.shipping_name ?? order.name,
      email: order.email,
      phone: order.phone,
      address: [order.shipping_address, order.shipping_address2].filter(Boolean).join(', ') || null,
      postalCode: order.shipping_postal_code,
      city: order.shipping_city,
    },
    object: order.delivery_mode === 'digital'
      ? 'Fichiers 3D téléchargeables'
      : 'Objets imprimés en 3D',
    items,
    adjustments,
    totalPaid: order.total_amount,
    paidAt: new Date(order.created_at),
  }
}

function draftFromCustom(order: CustomOrder): InvoiceDraft {
  return {
    recipient: {
      name: order.name,
      company: order.company,
      email: order.email,
      phone: order.phone,
      address: order.shipping_address,
      postalCode: order.shipping_postal_code,
      city: order.shipping_city,
    },
    object: fallbackQuoteObject(order) || `Projet sur-mesure — ${projectLabel(order)}`,
    items: fallbackQuoteItems(order, order.total_amount ?? 0),
    adjustments: [],
    totalPaid: order.total_amount ?? 0,
    // Le solde clôt le paiement ; sans solde, c'est l'acompte qui a tout réglé.
    paidAt: order.balance_paid_at ? new Date(order.balance_paid_at) : null,
  }
}

/**
 * Garantit que le total imprimé égale le montant encaissé.
 *
 * Un devis modifié après coup, un coupon Stripe, un barème de port qui a bougé :
 * il suffit d'un écart pour qu'une facture affiche autre chose que ce que le
 * client a payé. On absorbe la différence dans une ligne explicite plutôt que
 * de laisser passer un document faux.
 */
function reconcile(draft: InvoiceDraft): DocumentAdjustment[] {
  const computed = quoteTotal(draft.items) + draft.adjustments.reduce((sum, a) => sum + a.amount, 0)
  const gap = draft.totalPaid - computed
  if (gap === 0) return draft.adjustments
  return [...draft.adjustments, { label: gap < 0 ? 'Remise' : 'Ajustement', amount: gap }]
}

function buildDraft(source: InvoiceSource, order: Order | ShopOrder | CustomOrder): InvoiceDraft {
  if (source === 'nfc')  return draftFromNfc(order as Order)
  if (source === 'shop') return draftFromShop(order as ShopOrder)
  return draftFromCustom(order as CustomOrder)
}

/**
 * Renvoie la facture de la commande, en la créant si elle n'existe pas.
 *
 * Idempotent : la contrainte `unique (source, order_id)` fait qu'un second appel
 * (email d'expédition renvoyé, webhook rejoué) retombe sur la facture existante
 * au lieu d'en émettre une deuxième et de trouer la numérotation.
 */
export async function ensureInvoice(
  source: InvoiceSource,
  order: Order | ShopOrder | CustomOrder,
): Promise<InvoiceRecord> {
  const { data: existing } = await supabaseAdmin
    .from('invoices')
    .select('*')
    .eq('source', source)
    .eq('order_id', order.id)
    .maybeSingle()

  if (existing) return existing as unknown as InvoiceRecord

  const draft = buildDraft(source, order)
  const adjustments = reconcile(draft)
  const issuedAt = new Date()

  const row = {
    issued_at:          issuedAt.toISOString(),
    paid_at:            (draft.paidAt ?? issuedAt).toISOString(),
    source,
    order_id:           order.id,
    client_name:        draft.recipient.name,
    client_company:     draft.recipient.company ?? null,
    client_email:       draft.recipient.email ?? '',
    client_address:     draft.recipient.address ?? null,
    client_postal_code: draft.recipient.postalCode ?? null,
    client_city:        draft.recipient.city ?? null,
    object:             draft.object,
    items:              draft.items,
    adjustments,
    total_amount:       draft.totalPaid,
  }

  // Jusqu'à 3 essais : deux expéditions simultanées peuvent viser le même numéro.
  for (let attempt = 0; attempt < 3; attempt++) {
    const number = await nextInvoiceNumber(issuedAt.getFullYear())
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .insert({ ...row, number })
      .select()
      .single()

    if (!error && data) return data as unknown as InvoiceRecord
    if (!isInvoiceConflict(error)) {
      throw new Error(`Facture non émise : ${error?.message ?? 'erreur inconnue'}`)
    }

    // Conflit sur (source, order_id) : une facture vient d'être créée en
    // parallèle pour cette commande — c'est elle qui fait foi.
    const { data: raced } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('source', source)
      .eq('order_id', order.id)
      .maybeSingle()
    if (raced) return raced as unknown as InvoiceRecord
  }

  throw new Error('Facture non émise : numéro indisponible après plusieurs essais')
}

/** Rend le PDF d'une facture déjà émise. */
export function renderInvoicePdf(invoice: InvoiceRecord): Promise<Uint8Array> {
  return buildDocumentPdf({
    kind: 'invoice',
    number: invoice.number,
    recipient: {
      name: invoice.client_name,
      company: invoice.client_company,
      email: invoice.client_email,
      address: invoice.client_address,
      postalCode: invoice.client_postal_code,
      city: invoice.client_city,
    },
    object: invoice.object,
    items: invoice.items,
    adjustments: invoice.adjustments,
    issuedAt: new Date(invoice.issued_at),
    paidAt: invoice.paid_at ? new Date(invoice.paid_at) : null,
    orderRef: `#${invoice.order_id.slice(0, 8).toUpperCase()}`,
  })
}
