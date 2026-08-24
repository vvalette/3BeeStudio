'use client'

import { useEffect, useRef } from 'react'
import { runWhenIdle } from '@/lib/utils'

/**
 * Compte une consultation de fiche produit (admin → /admin/boutique/audience).
 *
 * Pourquoi côté client : la fiche est rendue en ISR (revalidate = 3600), donc
 * compter au rendu serveur ne verrait qu'une visite par heure.
 *
 * Rien n'est écrit dans le navigateur (ni cookie, ni localStorage) : le
 * dédoublonnage des visiteurs uniques se fait côté serveur sur un hash salé
 * rotatif. C'est ce qui garde la mesure dans l'exemption de consentement.
 *
 * `sendBeacon` plutôt que `fetch` : la requête est mise en file par le
 * navigateur, hors du chemin critique, et survit à une navigation immédiate.
 */
export function trackProductEvent(productId: string, event: 'view' | 'cart') {
  const payload = JSON.stringify({ productId, event })
  try {
    if (navigator.sendBeacon?.(
      '/api/boutique/view',
      new Blob([payload], { type: 'application/json' }),
    )) return
  } catch {
    // sendBeacon indisponible ou refusé : on retombe sur fetch.
  }
  void fetch('/api/boutique/view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {})
}

export default function ProductViewTracker({ productId }: { productId: string }) {
  const sent = useRef(false)

  useEffect(() => {
    // Le ref survit au double montage du StrictMode en dev — sans lui, chaque
    // visite comptait double en développement.
    if (sent.current) return
    sent.current = true
    // Différé à l'inactivité : le beacon ne doit pas disputer le réseau au LCP
    // de la fiche (images + viewer 3D). Volontairement sans annulation au
    // démontage — sinon le double montage du StrictMode annulerait l'envoi du
    // premier passage sans jamais en refaire un second (le ref reste posé).
    runWhenIdle(() => trackProductEvent(productId, 'view'))
  }, [productId])

  return null
}
