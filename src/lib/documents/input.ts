import { z } from 'zod'
import { projectTypeLabel, type CustomOrder, type QuoteLineItem } from '@/types/custom-order'

/** Schéma partagé par la route d'envoi et celle d'aperçu. */
export const quoteItemSchema = z.object({
  label:      z.string().trim().min(1, 'Libellé requis').max(200),
  detail:     z.string().trim().max(500).optional(),
  quantity:   z.number().int().positive().max(100000),
  unit_price: z.number().int().nonnegative().max(100000000), // centimes
})

export function projectLabel(order: CustomOrder): string {
  return projectTypeLabel(order.project_type)
}

/**
 * Objet de repli quand l'admin n'en a pas saisi : la première phrase de la
 * demande du client, tronquée. Mieux qu'un bandeau vide sur le PDF.
 */
export function fallbackQuoteObject(order: CustomOrder): string {
  if (order.quote_object) return order.quote_object
  const firstSentence = (order.description ?? '').split(/[.\n]/)[0]?.trim() ?? ''
  const base = firstSentence.length >= 10 ? firstSentence : projectLabel(order)
  return base.length > 200 ? `${base.slice(0, 197)}…` : base
}

/** Ligne unique de repli : un devis a toujours au moins une ligne à imprimer. */
export function fallbackQuoteItems(order: CustomOrder, total: number): QuoteLineItem[] {
  if (order.quote_items?.length) return order.quote_items
  return [{
    label: `Projet sur-mesure — ${projectLabel(order)}`,
    detail: 'Fabrication sur-mesure par impression 3D',
    quantity: 1,
    unit_price: total,
  }]
}
