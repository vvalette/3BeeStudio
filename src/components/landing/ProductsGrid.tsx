import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import Eyebrow from '@/components/ui/Eyebrow'
import Reveal from '@/components/ui/Reveal'
import type { ShopProduct } from '@/types/shop-product'
import BoutiqueProductCard from '@/components/boutique/BoutiqueProductCard'

interface Props {
  products: ShopProduct[]
  heading?: string
  subtitle?: string
}

export default async function ProductsGrid({ products, heading, subtitle }: Props) {
  const t = await getTranslations('productsGrid')

  const displayHeading = heading || t('heading')
  const displaySubtitle = subtitle || t('subtitle')

  if (products.length === 0) return null

  return (
    <section className="pt-12 pb-12 lg:pt-16 lg:pb-16" style={{ background: 'var(--bg-0)' }}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">

        <Reveal className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3"><Eyebrow>{t('eyebrow')}</Eyebrow></div>
              <h2
                className="font-sans font-bold text-ink-0"
                style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.025em' }}
              >
                {displayHeading}
              </h2>
              <p className="mt-2 text-[15px] text-ink-3 leading-relaxed">{displaySubtitle}</p>
            </div>
            <Link
              href="/boutique"
              className="font-mono text-amber whitespace-nowrap hover:text-amber-soft transition-colors shrink-0 mt-1"
              style={{ fontSize: 11, letterSpacing: '0.06em' }}
            >
              {t('viewAll')}
            </Link>
          </div>
        </Reveal>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {products.map((p) => <BoutiqueProductCard key={p.id} product={p} />)}
        </div>

      </div>
    </section>
  )
}
