'use client'

import { useState } from 'react'
import type { ShopProduct } from '@/types/shop-product'
import STLViewerWrapper from './STLViewerWrapper'

type ActiveView = { type: 'photo'; index: number } | { type: '3d' }

export default function BoutiqueProductMedia({ product }: { product: ShopProduct }) {
  const hasImages = product.images.length > 0
  const has3D     = !!product.stl_url

  const totalThumbs = product.images.length + (has3D ? 1 : 0)
  const showThumbs  = totalThumbs > 1

  const [active, setActive] = useState<ActiveView>(
    hasImages ? { type: 'photo', index: 0 } : { type: '3d' },
  )

  const is3dActive    = active.type === '3d'
  const activePhotoIdx = active.type === 'photo' ? active.index : -1

  return (
    <div className="space-y-3">

      {/* Visuel principal */}
      <div className={`aspect-square w-full overflow-hidden rounded-2xl bg-bg-1 ${is3dActive ? '' : 'border border-[var(--line)]'}`}>
        {is3dActive && has3D ? (
          <STLViewerWrapper url={product.stl_url!} fill />
        ) : hasImages ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[activePhotoIdx >= 0 ? activePhotoIdx : 0]}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-3">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
              <rect x="3" y="3" width="18" height="18" rx="3" /><path d="m3 9 4-4 4 4 4-4 4 4" /><circle cx="8" cy="14" r="2" />
            </svg>
          </div>
        )}
      </div>

      {/* Miniatures : photos + miniature 3D */}
      {showThumbs && (
        <div className={`grid gap-2 ${totalThumbs <= 3 ? 'grid-cols-3' : totalThumbs === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>

          {product.images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive({ type: 'photo', index: i })}
              className={[
                'aspect-square overflow-hidden rounded-xl border transition-colors cursor-pointer',
                activePhotoIdx === i
                  ? 'border-[var(--line-amber)]'
                  : 'border-[var(--line)] hover:border-[var(--line-2)]',
              ].join(' ')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}

          {has3D && (
            <button
              type="button"
              onClick={() => setActive({ type: '3d' })}
              className={[
                'aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border text-[10px] font-medium transition-colors cursor-pointer',
                is3dActive
                  ? 'border-[var(--line-amber)] bg-amber/5 text-amber'
                  : 'border-[var(--line)] bg-bg-1 text-ink-3 hover:border-[var(--line-2)] hover:text-ink-1',
              ].join(' ')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
              3D
            </button>
          )}

        </div>
      )}
    </div>
  )
}
