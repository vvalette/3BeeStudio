'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import type { ShopProduct } from '@/types/shop-product'
import { formatPrice } from '@/lib/utils'
import { useCart } from './CartProvider'

export default function AddToCartForm({ product }: { product: ShopProduct }) {
  const router = useRouter()
  const { addItem, open } = useCart()
  const [quantity, setQuantity] = useState(1)

  const maxQty = product.stock !== null ? product.stock : 99

  const cartPayload = {
    product_id: product.id,
    name:       product.name,
    slug:       product.slug,
    price:      product.price,
    image:      product.images[0] ?? null,
    max_stock:  product.stock,
  }

  function handleAdd() {
    addItem(cartPayload, quantity)
    open()
  }

  function handleBuyNow() {
    router.push(`/boutique/commande?product=${product.id}&qty=${quantity}`)
  }

  return (
    <div className="space-y-4">
      {/* Quantité */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Quantité</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--line)] text-ink-0 transition-colors hover:bg-bg-1"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8h10" /></svg>
          </button>
          <span className="w-7 text-center font-mono text-[16px] font-bold text-ink-0">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--line)] text-ink-0 transition-colors hover:bg-bg-1 disabled:opacity-30"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
          </button>
        </div>
        {product.stock !== null && product.stock <= 5 && (
          <span className="text-[12px] text-amber">Plus que {product.stock} en stock</span>
        )}
      </div>

      {/* Boutons */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleAdd}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-pill border border-[var(--line-amber)] bg-amber/10 py-3 font-bold text-amber transition-colors hover:bg-amber/20"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
            <path d="M2 2h2.5l2.2 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 6H5.2" />
          </svg>
          Ajouter au panier
        </button>
        <button
          type="button"
          onClick={handleBuyNow}
          className="w-full cursor-pointer rounded-pill bg-amber py-3 font-bold text-bg-0 transition-opacity hover:opacity-90"
        >
          Acheter maintenant · {formatPrice(product.price * quantity)} →
        </button>
      </div>
    </div>
  )
}
