'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Eyebrow from '@/components/ui/Eyebrow'
import ProductGlyph from '@/components/ui/ProductGlyph'
import Reveal from '@/components/ui/Reveal'
import { cn } from '@/lib/utils'

type GlyphKind = 'vase' | 'lamp' | 'chess' | 'planter' | 'speaker'

type Category = (typeof FILTERS)[number]

interface Product {
  id: string
  price: string
  hasTag?: boolean
  kind: GlyphKind
  cat: Exclude<Category, 'all'>
  featured?: boolean
}

// Clés de catégorie stables (libellés résolus via i18n) — 'all' = tout afficher
const FILTERS = ['all', 'deco', 'lamps', 'games', 'audio', 'plants'] as const

const PRODUCTS: Product[] = [
  { id: 'hiveVase',   price: '89€',  hasTag: true, kind: 'vase',    cat: 'deco',  featured: true },
  { id: 'apexLamp',   price: '129€',               kind: 'lamp',    cat: 'lamps' },
  { id: 'studioKing', price: '42€',  hasTag: true, kind: 'chess',   cat: 'games' },
  { id: 'pollenPot',  price: '34€',                kind: 'planter', cat: 'plants' },
  { id: 'sonusMini',  price: '89€',                kind: 'speaker', cat: 'audio' },
]

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M7 12 L2 7 Q-0.5 4.5 2 2 Q4.5 -0.5 7 2 Q9.5 -0.5 12 2 Q14.5 4.5 12 7 Z" stroke="var(--ink-0)" strokeWidth="1.2" />
    </svg>
  )
}

function ProductCard({ id, price, hasTag, kind, featured }: Product) {
  const t = useTranslations('productsGrid')
  const [liked, setLiked] = useState(false)
  const name = t(`products.${id}.name`)

  return (
    <div
      className={cn(
        'group relative overflow-hidden border border-[var(--line)] bg-bg-2 p-3.5 transition-all duration-300 hover:border-[var(--line-amber)] hover:-translate-y-1',
        featured ? 'col-span-2' : 'col-span-1'
      )}
      style={{ borderRadius: 24, boxShadow: 'var(--shadow-card)' }}
    >
      {hasTag && (
        <div className="absolute top-3 left-3 z-10 inline-flex items-center rounded-full border border-[var(--line-amber)] px-2 py-1 font-mono text-amber-soft" style={{ fontSize: 10, background: 'var(--amber-tint)' }}>
          {t(`products.${id}.tag`)}
        </div>
      )}

      <button
        aria-label={liked ? t('unfavorite') : t('favorite')}
        onClick={() => setLiked((v) => !v)}
        className="absolute top-3 right-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--line)] transition-colors hover:border-[var(--line-amber)]"
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
          <div className="font-mono text-ink-2" style={{ fontSize: 10, letterSpacing: '0.06em' }}>{t('material')}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[15px] font-bold text-amber">{price}</div>
          <div className="font-mono text-ink-3" style={{ fontSize: 9 }}>{t('inStock')}</div>
        </div>
      </div>
    </div>
  )
}

export default function ProductsGrid() {
  const t = useTranslations('productsGrid')
  const [active, setActive] = useState<Category>('all')

  const visible = active === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.cat === active)

  return (
    <section className="relative pt-12 pb-12 lg:pt-16 lg:pb-16 border-t border-[var(--line)]" style={{ background: 'var(--bg-1)' }}>

      {/* Banderolle — overlay par-dessus toute la section */}
      <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ backdropFilter: 'blur(3px)', background: 'rgba(10,10,11,0.72)' }}>
        {/* Rayures diagonales en filigrane */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 28px)',
          }}
        />
        {/* Bandeau central */}
        <div
          className="relative mx-5 w-full max-w-xl px-8 py-7 text-center"
          style={{
            borderRadius: 24,
            background: 'linear-gradient(160deg, #1E1500, #0E0A00)',
            border: '1px solid rgba(245,158,11,0.35)',
            boxShadow: '0 0 60px rgba(245,158,11,0.12), 0 2px 0 rgba(245,158,11,0.2) inset',
          }}
        >
          <div className="mb-4 flex items-center justify-center gap-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber">{t('comingSoon')}</span>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-60" style={{ animationDelay: '0.4s' }} />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber" />
            </span>
          </div>
          <h3
            className="font-sans font-bold text-ink-0"
            style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.025em', lineHeight: 1.1 }}
          >
            {t.rich('bannerTitle', {
              honey: (chunks) => <span className="honey-text">{chunks}</span>,
              br: () => <br />,
            })}
          </h3>
          <p className="mx-auto mt-3 text-sm leading-relaxed text-ink-3" style={{ maxWidth: 320 }}>
            {t('bannerDesc')}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="flex items-end justify-between mb-8">
          <div>
            <div className="mb-3"><Eyebrow>{t('eyebrow')}</Eyebrow></div>
            <h2 className="font-sans font-bold text-ink-0" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
              {t('heading')}
            </h2>
          </div>
          <Link href="/boutique" className="font-mono text-amber whitespace-nowrap hover:text-amber-soft transition-colors" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
            {t('viewAll')}
          </Link>
        </Reveal>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 no-scrollbar">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setActive(filter)}
              className="flex-shrink-0 inline-flex cursor-pointer items-center rounded-pill px-3.5 py-2 text-xs font-medium border transition-colors"
              style={{
                fontSize: 12,
                background: active === filter ? 'var(--ink-0)' : 'var(--bg-3)',
                color: active === filter ? '#0A0A0B' : 'var(--ink-1)',
                border: active === filter ? 'none' : '1px solid var(--line)',
                fontWeight: active === filter ? 600 : 500,
              }}
            >
              {t(`filters.${filter}`)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
          {visible.map((p) => <ProductCard key={p.id} {...p} />)}
        </div>
      </div>
    </section>
  )
}
