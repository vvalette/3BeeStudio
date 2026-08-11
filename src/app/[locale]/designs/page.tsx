import { supabase } from '@/lib/supabase'
import type { ShopProductCard } from '@/types/shop-product'
import type { ShopCategoryRow } from '@/types/shop-category'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import BoutiqueCatalog from '@/components/boutique/BoutiqueCatalog'

/**
 * Catalogue des **fichiers 3D** téléchargeables, séparé de la boutique.
 *
 * Les deux natures de produit ne se comparent pas : un objet imprimé se choisit
 * sur son rendu et son délai d'expédition, un fichier sur ce qu'on pourra en faire
 * avec sa propre imprimante. Les mélanger dans la même grille brouillait les deux
 * (frais de port affichés à côté de produits sans port, stock à côté d'illimité).
 */

// ISR long + revalidation à la demande via revalidateShop() (src/lib/revalidate.ts)
export const revalidate = 3600

type Props = {
  params: Promise<{ locale: Locale }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'designs' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  }
}

export default async function DesignsPage({ params }: Props) {
  const { locale } = await params
  // Obligatoire pour garder la page statique / ISR (sinon MISS CDN à chaque visite).
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'designs' })

  const [{ data: productsData }, { data: catsData }] = await Promise.all([
    supabase
      .from('shop_products')
      .select('id, slug, name, name_en, subtitle, subtitle_en, price, sale_price, stock, images, stl_url, model_rotation, category, featured, product_type')
      .eq('active', true)
      .eq('product_type', 'digital')
      .order('created_at', { ascending: false }),
    supabase.from('shop_categories').select('*').order('sort_order').order('created_at'),
  ])

  const products = (productsData ?? []) as ShopProductCard[]
  // On ne garde que les catégories réellement représentées ici : afficher des
  // onglets vides hérités de la boutique physique ne servirait à rien.
  const usedKeys  = new Set(products.map((p) => p.category).filter(Boolean))
  const categories = ((catsData ?? []) as ShopCategoryRow[]).filter((c) => usedKeys.has(c.key))

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-8 pb-16">
      <div className="mx-auto max-w-5xl">

        <header className="mb-10 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-amber">{t('eyebrow')}</p>
          <h1 className="mt-3 font-extrabold text-ink-0" style={{ fontSize: 'clamp(2rem, 6vw, 3rem)', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            {t('title')}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-base text-ink-2">
            {t('description')}
          </p>

          {/* Ce qu'on achète exactement — la première question du visiteur */}
          <ul className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-2 text-[12px]">
            {(['instant', 'noShipping', 'personalUse'] as const).map((k) => (
              <li key={k} className="flex items-center gap-1.5 rounded-pill border border-[var(--line)] bg-bg-1 px-3 py-1.5 text-ink-2">
                <svg className="shrink-0 text-amber" width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 7l3.5 3.5L12 4" />
                </svg>
                {t(`perks.${k}`)}
              </li>
            ))}
          </ul>
        </header>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] py-16 text-center">
            <p className="text-ink-2">{t('empty')}</p>
            <Link href="/boutique" className="mt-3 inline-block text-[13px] font-medium text-amber transition-colors hover:text-amber-soft">
              {t('emptyCta')}
            </Link>
          </div>
        ) : (
          <BoutiqueCatalog products={products} categories={categories} locale={locale} />
        )}

        {/* Passerelle vers les objets imprimés, pour qui n'a pas d'imprimante */}
        <section className="mt-14 rounded-2xl border border-[var(--line)] bg-bg-1 px-6 py-7 text-center">
          <p className="text-sm font-semibold text-ink-0">{t('crossSell.title')}</p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-2">{t('crossSell.description')}</p>
          <Link
            href="/boutique"
            className="mt-4 inline-flex items-center gap-1.5 rounded-pill bg-amber px-5 py-2.5 text-[13px] font-bold text-bg-0 transition-opacity hover:opacity-90"
          >
            {t('crossSell.cta')}
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7h8M8 4l3 3-3 3" />
            </svg>
          </Link>
        </section>
      </div>
    </main>
  )
}
