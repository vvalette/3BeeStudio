'use client'

import { useState } from 'react'
import type { ShopProduct } from '@/types/shop-product'
import STLViewerWrapper from './STLViewerWrapper'

type Tab = 'photos' | '3d'

export default function BoutiqueProductMedia({ product }: { product: ShopProduct }) {
  const hasImages = product.images.length > 0
  const has3D     = !!product.stl_url

  const [tab, setTab]       = useState<Tab>(hasImages ? 'photos' : '3d')
  const [active, setActive] = useState(0)

  return (
    <div className="space-y-3">
      {/* Toggle Photos / 3D — affiché uniquement si les deux existent */}
      {hasImages && has3D && (
        <div className="inline-flex rounded-pill border border-[var(--line)] bg-bg-1 p-1">
          <button
            onClick={() => setTab('photos')}
            className={`cursor-pointer rounded-pill px-4 py-1.5 text-[12px] font-medium transition-colors ${
              tab === 'photos' ? 'bg-bg-3 text-ink-0' : 'text-ink-3 hover:text-ink-1'
            }`}
          >
            Photos
          </button>
          <button
            onClick={() => setTab('3d')}
            className={`flex cursor-pointer items-center gap-1.5 rounded-pill px-4 py-1.5 text-[12px] font-medium transition-colors ${
              tab === '3d' ? 'bg-bg-3 text-amber' : 'text-ink-3 hover:text-ink-1'
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Modèle 3D
          </button>
        </div>
      )}

      {/* Visuel principal */}
      <div className={`aspect-square w-full overflow-hidden rounded-2xl bg-bg-1 ${tab === '3d' && has3D ? '' : 'border border-[var(--line)]'}`}>
        {tab === '3d' && has3D ? (
          <STLViewerWrapper url={product.stl_url!} fill />
        ) : hasImages ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.images[active]} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-3">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
              <rect x="3" y="3" width="18" height="18" rx="3" /><path d="m3 9 4-4 4 4 4-4 4 4" /><circle cx="8" cy="14" r="2" />
            </svg>
          </div>
        )}
      </div>

      {/* Miniatures — uniquement en mode photos */}
      {tab === 'photos' && product.images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {product.images.slice(0, 5).map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`aspect-square overflow-hidden rounded-xl border transition-colors ${
                active === i ? 'border-[var(--line-amber)]' : 'border-[var(--line)] hover:border-[var(--line-2)]'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-full w-full object-cover cursor-pointer" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
