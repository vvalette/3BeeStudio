import { supabase } from '@/lib/supabase'
import type { ShopProduct } from '@/types/shop-product'
import type { ShopCategoryRow } from '@/types/shop-category'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import BoutiqueCatalog from '@/components/boutique/BoutiqueCatalog'

export const revalidate = 60

type Props = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ cancelled?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'boutique.page' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function BoutiquePage({ params, searchParams }: Props) {
  const { locale } = await params
  const { cancelled } = await searchParams
  const t = await getTranslations({ locale, namespace: 'boutique.page' })

  const [{ data: productsData }, { data: catsData }] = await Promise.all([
    supabase.from('shop_products').select('*').eq('active', true).order('created_at', { ascending: false }),
    supabase.from('shop_categories').select('*').order('sort_order').order('created_at'),
  ])

  const products   = (productsData ?? []) as ShopProduct[]
  const categories = (catsData ?? []) as ShopCategoryRow[]

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-8 pb-16">
      <div className="mx-auto max-w-5xl">

        {/* En-tête */}
        <header className="mb-10 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber">{t('eyebrow')}</p>
          <h1 className="mt-3 font-extrabold text-ink-0" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            {t('title')}
          </h1>
          <p className="mt-3 text-base text-ink-2 max-w-md mx-auto">
            {t('description')}
          </p>
        </header>

        {/* Bannière annulation */}
        {cancelled === 'true' && (
          <div className="mb-6 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber text-center">
            {t('cancelBanner')}
          </div>
        )}

        {/* Catalogue avec tabs catégories */}
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] py-24 text-center">
            <p className="text-ink-3">{t('empty')}</p>
          </div>
        ) : (
          <BoutiqueCatalog products={products} categories={categories} locale={locale} />
        )}
      </div>
    </main>
  )
}
