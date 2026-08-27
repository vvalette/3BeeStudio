'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { CartItem } from '@/types/cart'
import CheckoutClient from './CheckoutClient'

// Lit ?product=&qty= côté client et résout l'article « Acheter maintenant »
// via /api/boutique/product, pour garder la page /boutique/commande statique.
export default function CheckoutLoader() {
  const searchParams = useSearchParams()
  const productId = searchParams.get('product')
  const qty = searchParams.get('qty')
  const color = searchParams.get('color')

  const [loading, setLoading] = useState(!!productId)
  const [forcedItems, setForcedItems] = useState<CartItem[] | undefined>(undefined)

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

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]" aria-busy>
        <div className="h-96 animate-pulse rounded-2xl border border-[var(--line)] bg-bg-1" />
        <div className="h-64 animate-pulse rounded-2xl border border-[var(--line)] bg-bg-1" />
      </div>
    )
  }

  return <CheckoutClient forcedItems={forcedItems} />
}
