import { supabase, supabaseAdmin } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import type { ShopProduct } from '@/types/shop-product'
import { toPublicProduct } from '@/types/shop-product'
import { calcShopShipping, SHOP_FREE_SHIPPING_THRESHOLD, effectivePrice, discountPercent } from '@/types/shop-product'
import { formatPrice, plainSummary } from '@/lib/utils'
import { buildAlternates, SITE_URL } from '@/lib/seo'
import { shopProductSchema, breadcrumbSchema } from '@/lib/schema'
import JsonLd from '@/components/seo/JsonLd'
import { getPathname } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import AddToCartForm from '@/components/boutique/AddToCartForm'
import BoutiqueProductMedia from '@/components/boutique/BoutiqueProductMedia'
import DescriptionExpand from '@/components/boutique/DescriptionExpand'
import ProductViewTracker from '@/components/boutique/ProductViewTracker'

// ISR long + revalidation à la demande via revalidateShop() (src/lib/revalidate.ts)
export const revalidate = 3600

// Pré-génère les fiches produit au build ; les nouveaux slugs sont rendus
// à la demande puis mis en cache (dynamicParams par défaut).
export async function generateStaticParams() {
  const { data } = await supabase.from('shop_products').select('slug').eq('active', true)
  return (data ?? []).map(({ slug }) => ({ slug }))
}

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
  // Les descriptions produit sont du markdown : repris brut, l'aperçu Google et
  // les cartes de partage affichaient les `**` et les puces.
  const description = plainSummary((isEn && data.description_en) ? data.description_en : data.description)

  return {
    title: `${name} — Boutique 3BeeStudio`,
    description,
    alternates: buildAlternates(`/boutique/${slug}`, locale),
    // Sans ça, la carte de partage montrait la bonne photo produit mais gardait
    // le titre et l'accroche génériques du layout : la moitié du travail.
    // L'image, elle, vient de `opengraph-image.tsx` dans ce même dossier.
    openGraph: {
      type:  'website',
      title: name,
      ...(description ? { description } : {}),
      url:   SITE_URL + getPathname({ href: `/boutique/${slug}`, locale }),
    },
    twitter: {
      card:  'summary_large_image',
      title: name,
      ...(description ? { description } : {}),
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; locale: Locale }>
}) {
  const { slug, locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'boutique.product' })
  const tDigital = await getTranslations({ locale, namespace: 'boutique.product.digital' })

  const { data, error } = await supabaseAdmin
    .from('shop_products')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (error || !data) notFound()

  // `toPublicProduct` retire `digital_file_path` : sans ça le chemin du fichier
  // vendu partait dans le payload RSC de la fiche produit (vérifié : il
  // apparaissait en clair dans le HTML), donnant une piste directe vers le
  // fichier payant. Les composants clients n'acceptent que PublicShopProduct.
  const product = toPublicProduct(data as ShopProduct)
  const isEn = locale === 'en'
  const displayName        = (isEn && product.name_en)        ? product.name_en        : product.name
  const displaySubtitle    = (isEn && product.subtitle_en)    ? product.subtitle_en    : product.subtitle
  const displayDescription = (isEn && product.description_en) ? product.description_en : product.description
  const isDigitalProduct = product.product_type === 'digital'
  // Un fichier ne s'épuise pas : pas de mention de rupture sur un produit numérique.
  const outOfStock = !isDigitalProduct && product.stock !== null && product.stock === 0

  const exampleSubtotal = effectivePrice(product)
  // Affiche le tarif le moins cher proposé au checkout (point relais),
  // sinon la fiche annonçait 6,90 € alors que le client peut payer 3,90 €.
  const shipping        = calcShopShipping(exampleSubtotal, 'relay')
  const discount        = discountPercent(product)

  // Balisage Schema.org : c'est ici que les résultats enrichis (prix,
  // disponibilité) ont le plus d'effet, la fiche étant la vraie page produit.
  // Les URLs d'images doivent être absolues pour Google.
  const canonical = SITE_URL + getPathname({ href: `/boutique/${slug}`, locale })
  const absoluteImages = (product.images ?? []).map((src) =>
    src.startsWith('http') ? src : `${SITE_URL}${src.startsWith('/') ? '' : '/'}${src}`,
  )

  const productLd = shopProductSchema({
    name:        displayName,
    description: plainSummary(displayDescription),
    images:      absoluteImages,
    url:         canonical,
    sku:         product.id,
    priceCents:  effectivePrice(product),
    stock:       product.stock,
    digital:     isDigitalProduct,
  })

  // Repris mot pour mot du fil d'Ariane affiché plus bas : Google refuse un
  // balisage qui ne correspond pas à ce que voit le visiteur.
  const breadcrumbLd = breadcrumbSchema([
    { name: t('breadcrumb'), url: SITE_URL + getPathname({ href: '/boutique', locale }) },
    { name: displayName,     url: canonical },
  ])

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-16">
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />
      {/* Compteur d'audience — invisible, ne rend rien (voir /admin/boutique/audience) */}
      <ProductViewTracker productId={product.id} />
      <div className="mx-auto max-w-5xl">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-[12px] text-ink-3">
          <Link href="/boutique" className="hover:text-ink-1 transition-colors">{t('breadcrumb')}</Link>
          <span>/</span>
          <span className="text-ink-2">{displayName}</span>
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
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">{t('eyebrow')}</p>
              <h1 className="mt-2 font-extrabold text-ink-0" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                {displayName}
              </h1>
              {displaySubtitle && (
                <p className="mt-2 font-mono text-[14px] tracking-[0.04em] text-ink-1">{displaySubtitle}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-4">
                <span className="font-mono text-3xl font-bold text-amber">{formatPrice(effectivePrice(product))}</span>
                {product.sale_price !== null && (
                  <span className="font-mono text-xl text-ink-3 line-through">{formatPrice(product.price)}</span>
                )}
                {discount !== null && (
                  <span className="rounded-pill border border-red-500/30 bg-red-500/15 px-2.5 py-1 font-mono text-[12px] font-bold text-red-400">
                    -{discount}%
                  </span>
                )}
                {outOfStock ? (
                  <span className="rounded-pill bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-xs text-red-400">{t('outOfStockBadge')}</span>
                ) : product.stock !== null ? (
                  <span className="rounded-pill border border-[var(--line)] bg-bg-1 px-2.5 py-1 text-[11px] text-ink-3">{t('inStockCount', { count: product.stock })}</span>
                ) : (
                  <span className="rounded-pill border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[11px] text-green-400">{t('inStock')}</span>
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
                {t('outOfStockMsg')}
              </div>
            )}

            {/* Réassurance livraison */}
            <div className="rounded-xl border border-[var(--line)] bg-bg-1 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3">

                {/* Livraison — remplacée par la livraison numérique sur un fichier */}
                <div className="flex items-center gap-3.5 px-5 py-4 border-b border-[var(--line)] sm:border-b-0 sm:border-r">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(245,158,11,0.1)' }}>
                    {isDigitalProduct ? (
                      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M8 2v8M8 10L5 7M8 10l3-3M2.5 13h11" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect x="1" y="7" width="13" height="11" rx="2"/>
                        <path d="M14 10h4l3 4.5V18h-7V10z"/>
                        <circle cx="5.5" cy="18" r="2"/>
                        <circle cx="18" cy="18" r="2"/>
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    {isDigitalProduct ? (
                      <>
                        <p className="text-[13px] font-semibold text-ink-0 leading-tight">
                          {tDigital('title')} <span className="text-amber">{tDigital('noShipping')}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-2">{tDigital('description')}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-[13px] font-semibold text-ink-0 leading-tight">
                          {t('shipping')}{' '}
                          <span className="text-amber">{shipping === 0 ? t('shippingFree') : t('shippingFrom', { price: formatPrice(shipping) })}</span>
                        </p>
                        {shipping > 0 && (
                          <p className="mt-0.5 text-[11px] text-ink-2">{t('shippingThreshold', { price: formatPrice(SHOP_FREE_SHIPPING_THRESHOLD) })}</p>
                        )}
                      </>
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
                    <p className="text-[13px] font-semibold text-ink-0 leading-tight">{t('leadTime')}</p>
                    <p className="mt-0.5 text-[11px] text-ink-3">{t('leadTimeLabel')}</p>
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
                    <p className="text-[13px] font-semibold text-ink-0 leading-tight">{t('handmade')}</p>
                    <p className="mt-0.5 text-[11px] text-ink-3">{t('madeInFrance')}</p>
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
