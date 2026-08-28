'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { CartItem } from '@/types/cart'
import CheckoutClient, { type CheckoutPrefill } from './CheckoutClient'

// Résout côté client les deux entrées qui imposent le contenu du panier, pour
// garder la page /boutique/commande statique :
//   ?product=&qty=&color=  → « Acheter maintenant » depuis une fiche produit
//   ?panier=<token>        → reprise d'un panier abandonné (email de relance)
export default function CheckoutLoader() {
  const searchParams = useSearchParams()
  const productId = searchParams.get('product')
  const qty = searchParams.get('qty')
  const color = searchParams.get('color')
  const cartToken = searchParams.get('panier')

  const [loading, setLoading] = useState(!!productId || !!cartToken)
  const [forcedItems, setForcedItems] = useState<CartItem[] | undefined>(undefined)
  const [prefill, setPrefill] = useState<CheckoutPrefill | undefined>(undefined)
  const [recoveredToken, setRecoveredToken] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!productId) return
    let alive = true
    const params = new URLSearchParams({ id: productId })
    if (qty) params.set('qty', qty)
    if (color) params.set('color', color)

    fetch(`/api/boutique/product?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { item: CartItem } | null) => {
        if (!alive) return
        if (data?.item) setForcedItems([data.item])
        setLoading(false)
      })
      .catch(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [productId, qty, color])

  // Reprise d'un panier abandonné. Le lien de l'email ne peut pas rouvrir
  // l'ancienne session Stripe (expirée en 30 min) : le panier est reconstruit
  // ici, aux prix et stocks du jour.
  useEffect(() => {
    // « Acheter maintenant » gagne : il vient d'un clic, la relance d'un email.
    if (!cartToken || productId) return
    let alive = true

    fetch('/api/boutique/cart/restore', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: cartToken }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items: CartItem[]; contact?: { name: string | null; email: string }; token?: string } | null) => {
        if (!alive) return
        // Panier vide après réconciliation (tout est parti en rupture) : on ne
        // force rien, le client retombe sur son propre panier ou sur l'écran vide.
        if (data?.items && data.items.length > 0) {
          setForcedItems(data.items)
          setRecoveredToken(data.token)
          if (data.contact) {
            const parts = (data.contact.name ?? '').trim().split(' ')
            setPrefill({
              firstName: parts[0] ?? '',
              lastName:  parts.slice(1).join(' '),
              email:     data.contact.email,
            })
          }
        }
        setLoading(false)
      })
      .catch(() => { if (alive) setLoading(false) })

    return () => { alive = false }
  }, [cartToken, productId])

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" aria-busy>
        <div className="h-96 animate-pulse rounded-2xl border border-[var(--line)] bg-bg-1" />
        <div className="h-64 animate-pulse rounded-2xl border border-[var(--line)] bg-bg-1" />
      </div>
    )
  }

  return <CheckoutClient forcedItems={forcedItems} prefill={prefill} recoveryToken={recoveredToken} />
}
