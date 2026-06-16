import { supabase, supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { ShopProduct } from '@/types/shop-product'
import { calcShopShipping, SHOP_FREE_SHIPPING_THRESHOLD } from '@/types/shop-product'
import { formatPrice } from '@/lib/utils'
import { buildAlternates } from '@/lib/seo'
import type { Locale } from '@/i18n/routing'
import type { Metadata } from 'next'
import AddToCartForm from '@/components/boutique/AddToCartForm'
import BoutiqueProductMedia from '@/components/boutique/BoutiqueProductMedia'
import DescriptionExpand from '@/components/boutique/DescriptionExpand'

export const revalidate = 60

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: Locale }>
}): Promise<Metadata> {
  const { slug, locale } = await params
  const { data } = await supabase
    .from('shop_products')
    .select('name, name_en, description, description_en')
    .eq('slug', slug)
    .single()
  if (!data) return {}

  const isEn = locale === 'en'
  const name = (isEn && data.name_en) ? data.name_en : data.name
  const description = (isEn && data.description_en) ? data.description_en : data.description

  return {
    title: `${name} — Boutique 3BeeStudio`,
    description,
    alternates: buildAlternates(`/boutique/${slug}`, locale),
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale } = await params

  const { data, error } = await supabaseAdmin
    .from('shop_products')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (error || !data) notFound()

  const product = data as ShopProduct
  const isEn = locale === 'en'
  const displayName        = (isEn && product.name_en)        ? product.name_en        : product.name
  const displaySubtitle    = (isEn && product.subtitle_en)    ? product.subtitle_en    : product.subtitle
  const displayDescription = (isEn && product.description_en) ? product.description_en : product.description
  const outOfStock = product.stock !== null && product.stock === 0

  const exampleSubtotal = product.price
  const shipping        = calcShopShipping(exampleSubtotal)

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-16">
      <div className="mx-auto max-w-5xl">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-[12px] text-ink-3">
          <a href="/boutique" className="hover:text-ink-1 transition-colors">Boutique</a>
          <span>/</span>
          <span className="text-ink-2">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 lg:items-start">

          {/* Colonne visuelle — sticky sur desktop */}
          <div className="lg:sticky lg:top-[88px]">
            <BoutiqueProductMedia product={product} />
          </div>

          {/* Colonne infos + achat */}
          <div className="flex flex-col gap-6">

            {/* En-tête : titre, sous-titre, prix */}
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Impression 3D · Fait main</p>
              <h1 className="mt-2 font-extrabold text-ink-0" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                {displayName}
              </h1>
              {displaySubtitle && (
                <p className="mt-2 font-mono text-[14px] tracking-[0.04em] text-ink-1">{displaySubtitle}</p>
              )}
              <div className="mt-4 flex items-center gap-3 border-t border-[var(--line)] pt-4">
                <span className="font-mono text-3xl font-bold text-amber">{formatPrice(product.price)}</span>
                {outOfStock ? (
                  <span className="rounded-pill bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-xs text-red-400">Rupture de stock</span>
                ) : product.stock !== null ? (
                  <span className="rounded-pill border border-[var(--line)] bg-bg-1 px-2.5 py-1 text-[11px] text-ink-3">{product.stock} en stock</span>
                ) : (
                  <span className="rounded-pill border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[11px] text-green-400">En stock</span>
                )}
              </div>
            </div>

            {/* Description */}
            {displayDescription && (
              <DescriptionExpand text={displayDescription} />
            )}

            {/* Bloc d'achat — panier / achat direct */}
            {!outOfStock ? (
              <AddToCartForm product={product} />
            ) : (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center">
                Ce produit est temporairement en rupture de stock.
              </div>
            )}

            {/* Réassurance livraison */}
            <div className="rounded-xl border border-[var(--line)] bg-bg-1 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3">

                {/* Livraison */}
                <div className="flex items-center gap-3.5 px-5 py-4 border-b border-[var(--line)] sm:border-b-0 sm:border-r">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(245,158,11,0.1)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="1" y="7" width="13" height="11" rx="2"/>
                      <path d="M14 10h4l3 4.5V18h-7V10z"/>
                      <circle cx="5.5" cy="18" r="2"/>
                      <circle cx="18" cy="18" r="2"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink-0 leading-tight">
                      Livraison{' '}
                      <span className="text-amber">{shipping === 0 ? 'offerte' : formatPrice(shipping)}</span>
                    </p>
                    {shipping > 0 && (
                      <p className="mt-0.5 text-[11px] text-ink-3">dès {formatPrice(SHOP_FREE_SHIPPING_THRESHOLD)} d&apos;achat</p>
                    )}
                  </div>
                </div>

                {/* Délai */}
                <div className="flex items-center gap-3.5 px-5 py-4 border-b border-[var(--line)] sm:border-b-0 sm:border-r">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(245,158,11,0.1)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="9"/>
                      <path d="M12 7v5l3.5 2"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-ink-0 leading-tight">3 à 7 jours</p>
                    <p className="mt-0.5 text-[11px] text-ink-3">délai indicatif</p>
                  </div>
                </div>

                {/* Fait main */}
                <div className="flex items-center gap-3.5 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(245,158,11,0.1)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 2L21 7.5v9L12 22l-9-5.5v-9L12 2z"/>
                      <path d="M12 22v-9.5M3 7.5l9 5 9-5"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-ink-0 leading-tight">Fait main</p>
                    <p className="mt-0.5 text-[11px] text-ink-3">imprimé en France</p>
                  </div>
                </div>

              </div>
            </div>
</div>
        </div>
      </div>
    </main>
  )
}
