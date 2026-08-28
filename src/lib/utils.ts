import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amountCents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amountCents / 100)
}

/**
 * Exécute `cb` pendant une période d'inactivité du thread principal
 * (fallback setTimeout sur les navigateurs sans requestIdleCallback).
 * Retourne une fonction d'annulation. Client uniquement.
 */
export function runWhenIdle(cb: () => void, timeout = 2000): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(cb, { timeout })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(cb, Math.min(timeout, 1500))
  return () => window.clearTimeout(id)
}

/**
 * Résumé en texte brut d'une description produit rédigée en markdown.
 *
 * Les descriptions de la boutique sont du markdown complet (gras, listes, sauts
 * de ligne), rendu tel quel sur la fiche. Repris brut dans une balise, il
 * ressortait avec ses `**` et ses puces dans l'aperçu Google et sur les cartes
 * de partage — là où seul du texte suivi a du sens.
 *
 * Ne garde donc que le début du texte, nettoyé et coupé sur un mot entier.
 */
export function plainSummary(markdown: string | null, maxLength = 300): string | null {
  if (!markdown) return null

  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')      // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // liens → libellé seul
    .replace(/^#{1,6}\s+/gm, '')               // titres
    .replace(/^\s*[-*+]\s+/gm, '')             // puces
    .replace(/[*_`]/g, '')                     // gras, italique, code
    .replace(/\s+/g, ' ')
    .trim()

  if (!text) return null
  if (text.length <= maxLength) return text

  const cut = text.slice(0, maxLength)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}
