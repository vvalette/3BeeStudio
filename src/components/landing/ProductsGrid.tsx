'use client'

import { useState } from 'react'
import Link from 'next/link'
import Eyebrow from '@/components/ui/Eyebrow'
import ProductGlyph from '@/components/ui/ProductGlyph'
import { cn } from '@/lib/utils'

type GlyphKind = 'vase' | 'lamp' | 'chess' | 'planter' | 'speaker'

interface Product {
  name: string
  price: string
  tag?: string
  kind: GlyphKind
  featured?: boolean
}

const FILTERS = ['Tout', 'Déco', 'Lampes', 'Jeux', 'Audio', 'Plantes'] as const

const PRODUCTS: Product[] = [
  { name: 'Hive Vase 01',     price: '89€',  tag: 'Nouveau',         kind: 'vase',    featured: true },
  { name: 'Apex Lamp',        price: '129€',                         kind: 'lamp' },
  { name: "Roi de l'Atelier", price: '42€',  tag: 'Édition limitée', kind: 'chess' },
  { name: 'Pollen Pot S',     price: '34€',                          kind: 'planter' },
  { name: 'Sonus Mini',       price: '89€',                          kind: 'speaker' },
]

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 12 L2 7 Q-0.5 4.5 2 2 Q4.5 -0.5 7 2 Q9.5 -0.5 12 2 Q14.5 4.5 12 7 Z" stroke="var(--ink-0)" strokeWidth="1.2" />
    </svg>
  )
}

function ProductCard({ name, price, tag, kind, featured }: Product) {
  const [liked, setLiked] = useState(false)

  return (
    <div
      className={cn(
        'group relative overflow-hidden border border-[var(--line)] bg-bg-2 p-3.5 transition-all duration-300 hover:border-[var(--line-amber)] hover:-translate-y-1',
        featured ? 'col-span-2' : 'col-span-1'
      )}
      style={{ borderRadius: 24, boxShadow: 'var(--shadow-card)' }}
    >
      {tag && (
        <div className="absolute top-3 left-3 z-10 inline-flex items-center rounded-full border border-[var(--line-amber)] px-2 py-1 font-mono text-amber-soft" style={{ fontSize: 10, background: 'var(--amber-tint)' }}>
          {tag}
        </div>
      )}

      <button
        aria-label={liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        onClick={() => setLiked((v) => !v)}
        className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] transition-colors hover:border-[var(--line-amber)]"
        style={{ background: liked ? 'var(--amber-tint)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)' }}
      >
        <HeartIcon />
      </button>

      <div
        className={cn(
          'relative mb-3.5 flex items-center justify-center overflow-hidden border border-[var(--line)]',
          featured ? 'h-[200px] lg:h-[300px]' : 'h-[140px] lg:h-[230px]'
        )}
        style={{ borderRadius: 18, background: 'linear-gradient(135deg, #1F1F25, #0C0C0F)' }}
      >
        <div aria-hidden className="pointer-events-none absolute" style={{ top: '-30%', left: '50%', transform: 'translateX(-50%)', width: '120%', height: '70%', background: 'radial-gradient(ellipse, rgba(245,158,11,0.12), transparent 60%)' }} />
        <div className="relative transition-transform duration-500 group-hover:scale-105" style={{ width: '70%', height: '90%' }}>
          <ProductGlyph kind={kind} tone="neutral" />
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[15px] font-semibold leading-[1.2] text-ink-0 mb-0.5">{name}</div>
          <div className="font-mono text-ink-2" style={{ fontSize: 10, letterSpacing: '0.06em' }}>PLA · MAT NOIR</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[15px] font-bold text-amber">{price}</div>
          <div className="font-mono text-ink-3" style={{ fontSize: 9 }}>EN STOCK</div>
        </div>
      </div>
    </div>
  )
}

export default function ProductsGrid() {
  const [active, setActive] = useState(0)

  return (
    <section className="py-20 lg:py-28 border-t border-[var(--line)]" style={{ background: 'var(--bg-1)' }}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="mb-3"><Eyebrow>Boutique</Eyebrow></div>
            <h2 className="font-sans font-bold text-ink-0" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
              Nos pièces signature.
            </h2>
          </div>
          <Link href="/boutique" className="font-mono text-amber whitespace-nowrap hover:text-amber-soft transition-colors" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
            TOUT VOIR →
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 no-scrollbar">
          {FILTERS.map((filter, i) => (
            <button
              key={filter}
              onClick={() => setActive(i)}
              className="flex-shrink-0 inline-flex items-center rounded-pill px-3.5 py-2 text-xs font-medium border transition-colors"
              style={{
                fontSize: 12,
                background: active === i ? 'var(--ink-0)' : 'var(--bg-3)',
                color: active === i ? '#0A0A0B' : 'var(--ink-1)',
                border: active === i ? 'none' : '1px solid var(--line)',
                fontWeight: active === i ? 600 : 500,
              }}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          {PRODUCTS.map((p) => <ProductCard key={p.name} {...p} />)}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/boutique"
            className="flex h-[54px] items-center justify-center rounded-pill px-10 font-sans font-semibold text-[15px] text-ink-0 border border-[var(--line-2)] transition-all active:scale-[0.97] hover:bg-bg-3"
          >
            Voir les 42 produits
          </Link>
        </div>
      </div>
    </section>
  )
}
