'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { ShopProduct } from '@/types/shop-product'
import { formatPrice } from '@/lib/utils'
import STLViewerWrapper from './STLViewerWrapper'

const AUTO_DELAY = 3500 // ms avant de passer au slide photo

export default function BoutiqueProductCard({ product }: { product: ShopProduct }) {
  const router     = useRouter()
  const wasDrag    = useRef(false)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasImages  = product.images.length > 0
  const has3D      = !!product.stl_url
  const hasSwitch  = has3D && hasImages

  // Vue active : 'photo' ou '3d'
  const [view, setView] = useState<'3d' | 'photo'>(has3D ? '3d' : 'photo')

  const switchTo = useCallback((next: '3d' | 'photo', cancelAuto = true) => {
    if (cancelAuto && timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setView(next)
  }, [])

  // Auto-glissement 3D → photo après AUTO_DELAY
  useEffect(() => {
    if (!hasSwitch) return
    timerRef.current = setTimeout(() => setView('photo'), AUTO_DELAY)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [hasSwitch])

  const outOfStock = product.stock !== null && product.stock === 0

  function handlePointerDown(e: React.PointerEvent) {
    const id = e.pointerId
    const sx = e.clientX, sy = e.clientY
    const scrollY0 = window.scrollY
    wasDrag.current = false

    function onMove(ev: PointerEvent) {
      if (ev.pointerId !== id) return
      if ((ev.clientX - sx) ** 2 + (ev.clientY - sy) ** 2 > 64) wasDrag.current = true
    }
    function onEnd(ev: PointerEvent) {
      if (ev.pointerId !== id) return
      if (Math.abs(window.scrollY - scrollY0) > 5) wasDrag.current = true
      cleanup()
    }
    function onCancel(ev: PointerEvent) {
      if (ev.pointerId !== id) return
      wasDrag.current = true; cleanup()
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
      {/* Visuel */}
      <div className="relative w-full overflow-hidden bg-bg-2" style={{ height: 220 }}>

        {/* Couche 3D */}
        {has3D && (
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: view === '3d' ? 1 : 0, pointerEvents: view === '3d' ? 'auto' : 'none' }}
          >
            <STLViewerWrapper url={product.stl_url!} height={220} />
          </div>
        )}

        {/* Couche photo */}
        {hasImages && (
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: view === 'photo' ? 1 : 0, pointerEvents: view === 'photo' ? 'auto' : 'none' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}

        {/* Placeholder si ni photo ni 3D */}
        {!has3D && !hasImages && (
          <div className="flex h-full items-center justify-center text-ink-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="m3 9 4-4 4 4 4-4 4 4" />
              <circle cx="8" cy="14" r="2" />
            </svg>
          </div>
        )}

        {/* Indicateurs / toggle manuel — visible uniquement si les deux existent */}
        {hasSwitch && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            <button
              type="button"
              aria-label="Voir le modèle 3D"
              onClick={(e) => { e.stopPropagation(); switchTo('3d') }}
              className={[
                'cursor-pointer flex items-center justify-center rounded-full border transition-all duration-200',
                view === '3d'
                  ? 'w-6 h-5 border-amber bg-amber/20 text-amber'
                  : 'w-5 h-5 border-[var(--line)] bg-bg-0/70 text-ink-3 hover:border-amber/50 hover:text-ink-1',
              ].join(' ')}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Voir la photo"
              onClick={(e) => { e.stopPropagation(); switchTo('photo') }}
              className={[
                'cursor-pointer rounded-full border transition-all duration-200',
                view === 'photo'
                  ? 'w-6 h-[6px] border-amber bg-amber'
                  : 'w-[6px] h-[6px] border-[var(--line)] bg-bg-0/70 hover:border-amber/50',
              ].join(' ')}
            />
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10,10,11,0.6)' }}>
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
