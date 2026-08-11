'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Toutes les écritures de l'admin passent par ici.
 *
 * Avant, chaque composant faisait `if (res.ok) { … }` sans branche d'échec : un 500,
 * une coupure réseau ou une session expirée ne produisaient *rien* à l'écran — le
 * bouton arrêtait de tourner et on croyait avoir enregistré. Ce hook rend l'échec
 * visible, et traite le cas particulier du cookie admin périmé (7 jours) en
 * renvoyant vers l'écran de connexion au lieu de laisser l'admin cliquer dans le vide.
 */

const NETWORK_ERROR = 'Réseau indisponible — la modification n’a pas été enregistrée.'
const SESSION_EXPIRED = 'Session expirée — reconnexion…'
const SUCCESS_TTL = 2500

export interface AdminMutationOptions {
  method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** Sérialisé en JSON avec le bon Content-Type. Omis → pas de corps. */
  body?: unknown
  /** Bandeau de confirmation, effacé automatiquement. */
  successMessage?: string
  /** Rafraîchit les Server Components après succès. Défaut : true. */
  refresh?: boolean
}

/** Récupère le message d'erreur renvoyé par nos routes (`{ error: string }`). */
function extractMessage(payload: unknown): string | null {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const { error } = payload as { error: unknown }
    if (typeof error === 'string' && error.trim()) return error
  }
  return null
}

export function useAdminMutation() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const flashSuccess = useCallback((message: string) => {
    setSuccess(message)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setSuccess(null), SUCCESS_TTL)
  }, [])

  /**
   * Renvoie le corps de la réponse en cas de succès, `null` en cas d'échec —
   * jamais d'exception à attraper côté appelant. Un `null` signifie « rien n'a
   * changé côté serveur, et l'utilisateur voit pourquoi ».
   */
  const mutate = useCallback(async <T = unknown>(
    url: string,
    { method = 'PATCH', body, successMessage, refresh = true }: AdminMutationOptions = {},
  ): Promise<T | null> => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(url, {
        method,
        ...(body !== undefined
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
          : {}),
      })

      if (res.status === 401) {
        setError(SESSION_EXPIRED)
        router.push('/admin')
        return null
      }

      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        setError(extractMessage(payload) ?? `Erreur ${res.status} — modification non enregistrée.`)
        return null
      }

      if (successMessage) flashSuccess(successMessage)
      if (refresh) router.refresh()
      return (payload ?? ({} as T)) as T
    } catch {
      setError(NETWORK_ERROR)
      return null
    } finally {
      setLoading(false)
    }
  }, [router, flashSuccess])

  return {
    mutate,
    loading,
    error,
    success,
    setError,
    flashSuccess,
    clear: useCallback(() => { setError(null); setSuccess(null) }, []),
  }
}
