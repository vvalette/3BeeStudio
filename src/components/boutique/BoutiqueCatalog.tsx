'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { ShopProductCard } from '@/types/shop-product'
import type { ShopCategoryRow } from '@/types/shop-category'
import BoutiqueProductCard from './BoutiqueProductCard'

interface Props {
  products: ShopProductCard[]
  categories: ShopCategoryRow[]
  locale: string
}

export default function BoutiqueCatalog({ products, categories, locale }: Props) {
  const t = useTranslations('boutique.page')
  const isEn = locale === 'en'

  const hasFeatured = products.some((p) => p.featured)
  const [activeTab, setActiveTab] = useState<string>(hasFeatured ? '__popular' : '__all')

  const counts = useMemo(() => {
    const byCat: Record<string, number> = {}
    for (const cat of categories) {
      byCat[cat.key] = products.filter((p) => p.category === cat.key).length
    }
    return {
      popular: products.filter((p) => p.featured).length,
      byCat,
      all: products.length,
    }
  }, [products, categories])

  const tabs = useMemo(() => {
    const result: { key: string; label: string; count: number; icon?: boolean }[] = []
    if (counts.popular > 0) result.push({ key: '__popular', label: t('tabs.popular'), count: counts.popular, icon: true })
    for (const cat of categories) {
      result.push({ key: cat.key, label: isEn && cat.label_en ? cat.label_en : cat.label, count: counts.byCat[cat.key] ?? 0 })
    }
    result.push({ key: '__all', label: t('tabs.all'), count: counts.all })
    return result
  }, [categories, counts, isEn, t])

  const filtered = useMemo(() => {
    if (activeTab === '__popular') return products.filter((p) => p.featured)
    if (activeTab === '__all') return products
    return products.filter((p) => p.category === activeTab)
  }, [products, activeTab])

  return (
    <div>
      {/* Tabs */}
      <div className="no-scrollbar mb-8 flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const active = tab.key === activeTab
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex cursor-pointer shrink-0 items-center gap-2 rounded-pill border px-4 py-2 text-sm font-semibold transition-all',
                active
                  ? 'border-amber bg-amber/12 text-amber'
                  : 'border-[var(--line)] text-ink-3 hover:border-[var(--line-2)] hover:text-ink-1',
              ].join(' ')}
            >
              {tab.icon && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className={active ? 'text-amber' : 'text-ink-3'}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              )}
              {tab.label}
              <span className={[
                'flex h-5 min-w-5 items-center justify-center rounded-full font-mono text-[10px] px-1',
                active ? 'bg-amber/20 text-amber' : 'bg-bg-2 text-ink-3',
              ].join(' ')}>
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grille */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] py-20 text-center">
          <p className="text-ink-3">{t('tabEmpty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product, i) => (
            <BoutiqueProductCard
              key={product.id}
              product={product}
              locale={locale}
              showPopularBadge={activeTab === '__all' && product.featured}
              popularLabel={t('popularBadge')}
              eagerImage={i < 3}
            />
          ))}
        </div>
      )}
    </div>
  )
}
