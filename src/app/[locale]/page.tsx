import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { buildAlternates } from '@/lib/seo'
import { localBusinessSchema } from '@/lib/schema'
import JsonLd from '@/components/seo/JsonLd'
import type { Locale } from '@/i18n/routing'
import { supabase } from '@/lib/supabase'
import type { ShopProduct } from '@/types/shop-product'
import Hero            from '@/components/landing/Hero'
import NFCSection      from '@/components/landing/NFCSection'
import VideoStrip      from '@/components/landing/VideoStrip'
import CustomCTA       from '@/components/landing/CustomCTA'
import Portfolio       from '@/components/landing/Portfolio'
import ProductsGrid    from '@/components/landing/ProductsGrid'
import Testimonials    from '@/components/landing/Testimonials'
import NewsletterBlock from '@/components/landing/NewsletterBlock'
import SiteFooter      from '@/components/landing/SiteFooter'

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'homePage.meta' })
  return {
    title: t('title'),
    description: t('description'),
    alternates: buildAlternates('/', locale),
  }
}

export const revalidate = 60

export default async function HomePage() {
  const { data: productsData } = await supabase
    .from('shop_products')
    .select('id, name, slug, subtitle, description, price, images, stock, stl_url')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(8)

  const products = (productsData ?? []) as ShopProduct[]

  return (
    <div className="bg-bg-0 text-ink-0 w-full">
      <JsonLd data={localBusinessSchema()} />
      <Hero />
      <NFCSection />
      <div aria-hidden style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.35) 30%, rgba(245,158,11,0.35) 70%, transparent)' }} />
      <ProductsGrid products={products} />
      <div aria-hidden style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.35) 30%, rgba(245,158,11,0.35) 70%, transparent)' }} />
      <CustomCTA />
      <div aria-hidden style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.35) 30%, rgba(245,158,11,0.35) 70%, transparent)' }} />
      <VideoStrip />
      <Portfolio />
      <Testimonials />
      <NewsletterBlock />
      <SiteFooter />
    </div>
  )
}
