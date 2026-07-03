'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import type { ShopProductCard } from '@/types/shop-product'
import { discountPercent } from '@/types/shop-product'
import { formatPrice } from '@/lib/utils'
import STLViewerWrapper from './STLViewerWrapper'

const SLIDE_DURATION = 5000

type Slide = { type: '3d' } | { type: 'photo'; index: number }

export default function BoutiqueProductCard({
  product,
  locale,
  showPopularBadge = false,
  popularLabel = 'Populaire',
}: {
  product: ShopProductCard
  locale?: string
  showPopularBadge?: boolean
  popularLabel?: string
}) {
  const router  = useRouter()
  const t = useTranslations('boutique.card')
  const wasDrag = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const isEn = locale === 'en'
  const displayName    = (isEn && product.name_en)    ? product.name_en    : product.name
  const displaySubtitle = (isEn && product.subtitle_en) ? product.subtitle_en : product.subtitle

  const has3D     = !!product.stl_url
  const hasImages = product.images.length > 0

  // Séquence : photos en premier, puis 3D
  const slides: Slide[] = [
    ...product.images.map((_, i) => ({ type: 'photo', index: i } as Slide)),
    ...(has3D ? [{ type: '3d' } as Slide] : []),
  ]
  const total = slides.length

  // Démarre toujours sur la photo 0 : la page est prérendue statiquement, un
  // index basé sur Date.now() serait figé au build (carte blanche si le HTML
  // arrive sur le slide 3D) et divergerait du client à l'hydratation.
  // La synchro sur l'horloge globale reprend au premier tick de l'effet.
  const [activeIdx, setActiveIdx] = useState(0)
  const timeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const manualRef   = useRef(false)

  function stopLoop() {
    if (timeoutRef.current)  { clearTimeout(timeoutRef.current);  timeoutRef.current  = null }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }

  useEffect(() => {
    if (total <= 1) return
    // Synchronise toutes les cartes sur l'horloge globale
    const msUntilNext = SLIDE_DURATION - (Date.now() % SLIDE_DURATION)
    timeoutRef.current = setTimeout(() => {
      if (manualRef.current) return
      setActiveIdx(Math.floor(Date.now() / SLIDE_DURATION) % total)
      intervalRef.current = setInterval(() => {
        if (!manualRef.current)
          setActiveIdx(Math.floor(Date.now() / SLIDE_DURATION) % total)
      }, SLIDE_DURATION)
    }, msUntilNext)
    return stopLoop
  }, [total])

  function goTo(idx: number) {
    manualRef.current = true
    stopLoop()
    setActiveIdx(idx)
  }

  // N'active le contexte WebGL du viewer 3D que si la carte est visible à l'écran
  // (les navigateurs limitent le nombre de contextes WebGL simultanés).
  useEffect(() => {
    if (!has3D || !cardRef.current) return
    const el = cardRef.current
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [has3D])

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
      ref={cardRef}
      className="group relative block rounded-2xl border border-[var(--line)] bg-bg-1 overflow-hidden hover:border-[var(--line-amber)] transition-all duration-200 hover:shadow-amber hover:scale-[1.02] hover:z-10 cursor-pointer"
      onPointerDown={handlePointerDown}
      onClick={() => { if (!wasDrag.current) router.push(`/boutique/${product.slug}`) }}
    >
      {/* Visuel */}
      <div className="relative w-full overflow-hidden bg-bg-2 aspect-[4/3]">

        {/* Le viewer 3D n'est monté (contexte WebGL) que sur son slide actif et carte visible — pas de fondu, cut assumé. */}
        {has3D && active.type === '3d' && inView && (
          <div className="absolute inset-0">
            <STLViewerWrapper url={product.stl_url!} fill rotation={product.model_rotation ?? undefined} />
          </div>
        )}

        {product.images.map((src, i) => {
          const isActive = active.type === 'photo' && active.index === i
          // Tant que le viewer 3D n'est pas monté (hors viewport → pas de WebGL),
          // la photo 0 reste visible pour éviter une carte blanche.
          const isFallbackFor3D = active.type === '3d' && !inView && i === 0
          return (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700"
              style={{
                opacity: isActive || isFallbackFor3D ? 1 : 0,
                pointerEvents: isActive ? 'auto' : 'none',
              }}
            >
              <Image
                src={src}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                loading={i === 0 ? 'eager' : undefined}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          )
        })}

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

        {/* Badges top-left */}
        <div className="absolute left-2.5 top-2.5 z-10 flex flex-col gap-1.5">
          {discount !== null && !outOfStock && (
            <span className="rounded-pill border border-red-500/30 bg-red-500/80 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
              -{discount}%
            </span>
          )}
          {showPopularBadge && (
            <span className="flex items-center gap-1 rounded-pill border border-amber/40 bg-bg-0/90 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber backdrop-blur-sm">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              {popularLabel}
            </span>
          )}
        </div>

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
