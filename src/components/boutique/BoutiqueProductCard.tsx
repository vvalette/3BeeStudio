'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import type { ShopProduct } from '@/types/shop-product'
import { discountPercent } from '@/types/shop-product'
import { formatPrice } from '@/lib/utils'
import STLViewerWrapper from './STLViewerWrapper'

const SLIDE_DURATION = 5000

type Slide = { type: '3d' } | { type: 'photo'; index: number }

export default function BoutiqueProductCard({ product, locale }: { product: ShopProduct; locale?: string }) {
  const router  = useRouter()
  const t = useTranslations('boutique.card')
  const wasDrag = useRef(false)
  const isEn = locale === 'en'
  const displayName    = (isEn && product.name_en)    ? product.name_en    : product.name
  const displaySubtitle = (isEn && product.subtitle_en) ? product.subtitle_en : product.subtitle

  const has3D     = !!product.stl_url
  const hasImages = product.images.length > 0

  // Séquence : 3D en premier (si dispo), puis toutes les photos
  const slides: Slide[] = [
    ...(has3D ? [{ type: '3d' } as Slide] : []),
    ...product.images.map((_, i) => ({ type: 'photo', index: i } as Slide)),
  ]
  const total = slides.length

  const [activeIdx, setActiveIdx] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const manualRef   = useRef(false) // l'utilisateur a interagi → stop boucle

  function startLoop() {
    if (total <= 1) return
    intervalRef.current = setInterval(() => {
      setActiveIdx((i) => (i + 1) % total)
    }, SLIDE_DURATION)
  }

  function stopLoop() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    startLoop()
    return stopLoop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total])

  function goTo(idx: number) {
    manualRef.current = true
    stopLoop()
    setActiveIdx(idx)
  }

  const active = slides[activeIdx]
  const outOfStock = product.stock !== null && product.stock === 0
  const discount = discountPercent(product)

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

        {/* Couches empilées — toutes montées, opacité gère la visibilité */}
        {has3D && (
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: active.type === '3d' ? 1 : 0, pointerEvents: active.type === '3d' ? 'auto' : 'none' }}
          >
            <STLViewerWrapper url={product.stl_url!} height={220} />
          </div>
        )}

        {product.images.map((src, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: active.type === 'photo' && active.index === i ? 1 : 0,
              pointerEvents: active.type === 'photo' && active.index === i ? 'auto' : 'none',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        ))}

        {!has3D && !hasImages && (
          <div className="flex h-full items-center justify-center text-ink-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <path d="m3 9 4-4 4 4 4-4 4 4" />
              <circle cx="8" cy="14" r="2" />
            </svg>
          </div>
        )}

        {/* Indicateurs */}
        {total > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {slides.map((slide, i) => {
              const isCurrent = i === activeIdx
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={slide.type === '3d' ? t('view3D') : t('photoAlt', { n: i })}
                  onClick={(e) => { e.stopPropagation(); goTo(i) }}
                  className="cursor-pointer flex items-center justify-center transition-all duration-200"
                >
                  {slide.type === '3d' ? (
                    <span className={[
                      'flex items-center justify-center rounded-full border transition-all duration-200',
                      isCurrent
                        ? 'w-6 h-5 border-amber bg-amber/20 text-amber'
                        : 'w-5 h-5 border-[var(--line)] bg-bg-0/70 text-ink-3 hover:border-amber/50',
                    ].join(' ')}>
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </span>
                  ) : (
                    <span className={[
                      'block rounded-full border transition-all duration-200',
                      isCurrent
                        ? 'w-4 h-[6px] border-amber bg-amber'
                        : 'w-[6px] h-[6px] border-[var(--line)] bg-bg-0/70 hover:border-amber/50',
                    ].join(' ')} />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Badge promo */}
        {discount !== null && !outOfStock && (
          <div className="absolute left-2.5 top-2.5 z-10">
            <span className="rounded-pill border border-red-500/30 bg-red-500/80 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
              -{discount}%
            </span>
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(10,10,11,0.6)' }}>
            <span className="rounded-pill border border-red-500/30 bg-bg-0/80 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-red-400">
              {t('outOfStock')}
            </span>
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-4">
        <h2 className="font-semibold text-ink-0 leading-tight">{displayName}</h2>
        {displaySubtitle && (
          <p className="mt-0.5 font-mono text-[12px] tracking-[0.05em] text-ink-1 leading-snug">{displaySubtitle}</p>
        )}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-amber">
              {formatPrice(product.sale_price ?? product.price)}
            </span>
            {product.sale_price !== null && (
              <span className="font-mono text-[12px] text-ink-3 line-through">{formatPrice(product.price)}</span>
            )}
          </div>
          <span className="text-[11px] text-ink-3">
            {product.stock !== null ? (product.stock > 0 ? t('available', { count: product.stock }) : t('outOfStock')) : t('inStock')}
          </span>
        </div>

        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-200">
          <div className="overflow-hidden">
            <div className="pt-3 flex justify-center">
              {outOfStock ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill border border-red-500/20 bg-red-500/10 px-3 py-1 font-mono text-[11px] tracking-[0.06em] text-red-400">
                  {t('outOfStock')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-pill border border-amber/30 bg-amber/10 px-3 py-1 font-mono text-[11px] tracking-[0.06em] text-amber">
                  {t('order')}
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
