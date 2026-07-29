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
