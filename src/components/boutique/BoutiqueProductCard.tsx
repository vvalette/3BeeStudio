'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ShopProduct } from '@/types/shop-product'
import { formatPrice } from '@/lib/utils'
import STLViewerWrapper from './STLViewerWrapper'

export default function BoutiqueProductCard({ product }: { product: ShopProduct }) {
  const router = useRouter()
  const outOfStock = product.stock !== null && product.stock === 0
  const wasDrag = useRef(false)

  function handlePointerDown(e: React.PointerEvent) {
    const pointerId = e.pointerId
    const startX = e.clientX
    const startY = e.clientY
    const startScrollY = window.scrollY
    wasDrag.current = false

    function onMove(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      if (dx * dx + dy * dy > 64) wasDrag.current = true
    }

    function onEnd(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return
      if (Math.abs(window.scrollY - startScrollY) > 5) wasDrag.current = true
      cleanup()
    }

    function onCancel(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return
      wasDrag.current = true
      cleanup()
    }

    function cleanup() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onCancel)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onCancel)
  }

  return (
    <div
      className="group relative block rounded-2xl border border-[var(--line)] bg-bg-1 overflow-hidden hover:border-[var(--line-amber)] transition-all duration-200 hover:shadow-amber hover:scale-[1.02] hover:z-10 cursor-pointer"
      onPointerDown={handlePointerDown}
      onClick={() => { if (!wasDrag.current) router.push(`/boutique/${product.slug}`) }}
    >
      {/* Visuel — STL si dispo, sinon image, sinon placeholder */}
      <div className="relative w-full overflow-hidden bg-bg-2" style={{ height: 220 }}>
        {product.stl_url ? (
          <STLViewerWrapper url={product.stl_url} height={220} />
        ) : product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="m3 9 4-4 4 4 4-4 4 4" />
              <circle cx="8" cy="14" r="2" />
            </svg>
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: 'rgba(10,10,11,0.6)' }}>
            <span className="rounded-pill border border-red-500/30 bg-bg-0/80 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-red-400">
              Rupture de stock
            </span>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-4">
        <h2 className="font-semibold text-ink-0 leading-tight">{product.name}</h2>
        {product.subtitle && (
          <p className="mt-0.5 font-mono text-[12px] tracking-[0.05em] text-ink-1 leading-snug">{product.subtitle}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono font-bold text-amber">{formatPrice(product.price)}</span>
          <span className="text-[11px] text-ink-3">
            {product.stock !== null ? (product.stock > 0 ? `${product.stock} dispo` : 'Rupture') : 'En stock'}
          </span>
        </div>

        {/* CTA hover — grid trick : prend 0 hauteur quand caché */}
        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-200">
          <div className="overflow-hidden">
            <div className="pt-3 flex justify-center">
              {outOfStock ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill border border-red-500/20 bg-red-500/10 px-3 py-1 font-mono text-[11px] tracking-[0.06em] text-red-400">
                  Rupture de stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-pill border border-amber/30 bg-amber/10 px-3 py-1 font-mono text-[11px] tracking-[0.06em] text-amber">
                  Commander
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
