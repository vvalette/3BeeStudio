import Hero            from '@/components/landing/Hero'
import NFCSection      from '@/components/landing/NFCSection'
import VideoStrip      from '@/components/landing/VideoStrip'
import CustomCTA       from '@/components/landing/CustomCTA'
import Portfolio       from '@/components/landing/Portfolio'
import ProductsGrid    from '@/components/landing/ProductsGrid'
import Testimonials    from '@/components/landing/Testimonials'
import NewsletterBlock from '@/components/landing/NewsletterBlock'
import SiteFooter      from '@/components/landing/SiteFooter'

export default function HomePage() {
  return (
    <div className="bg-bg-0 text-ink-0 w-full">
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
