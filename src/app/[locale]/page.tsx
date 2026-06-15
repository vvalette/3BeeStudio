import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { buildAlternates } from '@/lib/seo'
import { localBusinessSchema } from '@/lib/schema'
import JsonLd from '@/components/seo/JsonLd'
import type { Locale } from '@/i18n/routing'
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

export default function HomePage() {
  return (
    <div className="bg-bg-0 text-ink-0 w-full">
      <JsonLd data={localBusinessSchema()} />
      <Hero />
      <NFCSection />
      <CustomCTA />
      <VideoStrip />
      <Portfolio />
      <ProductsGrid />
      <Testimonials />
      <NewsletterBlock />
      <SiteFooter />
    </div>
  )
}
