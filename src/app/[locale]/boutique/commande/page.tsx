import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import CheckoutLoader from '@/components/boutique/CheckoutLoader'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ locale: Locale }>
}

// Page statique : le mode « Acheter maintenant » (?product=&qty=) est résolu
// côté client par CheckoutLoader via /api/boutique/product.
export default async function CommandePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'boutique.checkout' })

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

        <Suspense fallback={null}>
          <CheckoutLoader />
        </Suspense>
      </div>
    </main>
  )
}
