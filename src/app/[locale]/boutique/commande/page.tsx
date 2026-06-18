import { supabase } from '@/lib/supabase'
import type { ShopProduct } from '@/types/shop-product'
import { effectivePrice } from '@/types/shop-product'
import type { CartItem } from '@/types/cart'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import CheckoutClient from '@/components/boutique/CheckoutClient'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ product?: string; qty?: string }>
}

export default async function CommandePage({ params, searchParams }: Props) {
  const { locale } = await params
  const { product: productId, qty } = await searchParams
  const t = await getTranslations({ locale, namespace: 'boutique.checkout' })

  // Mode « Acheter maintenant » : un produit imposé via l'URL
  let forcedItems: CartItem[] | undefined
  if (productId) {
    const { data } = await supabase
      .from('shop_products')
      .select('id, name, slug, price, sale_price, images, stock')
      .eq('id', productId)
      .eq('active', true)
      .single()

    if (data) {
      const p = data as ShopProduct
      const quantity = Math.max(1, Math.min(parseInt(qty ?? '1', 10) || 1, p.stock ?? 99))
      const effPrice = effectivePrice(p)
      forcedItems = [{
        product_id:     p.id,
        name:           p.name,
        slug:           p.slug,
        price:          effPrice,
        original_price: p.sale_price !== null ? p.price : null,
        image:          p.images[0] ?? null,
        quantity,
        max_stock:      p.stock,
      }]
    }
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-16">
      <div className="mx-auto max-w-5xl">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-[12px] text-ink-3">
          <Link href="/boutique" className="hover:text-ink-1 transition-colors">{t('breadcrumb')}</Link>
          <span>/</span>
          <span className="text-ink-2">{t('breadcrumbCurrent')}</span>
        </nav>

        <h1 className="mb-8 font-extrabold text-ink-0" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.25rem)', letterSpacing: '-0.025em' }}>
          {t('title')}
        </h1>

        <CheckoutClient forcedItems={forcedItems} />
      </div>
    </main>
  )
}
