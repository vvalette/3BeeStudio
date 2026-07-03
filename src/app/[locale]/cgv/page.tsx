import { use } from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import LegalLayout from '@/components/ui/LegalLayout'
import { buildAlternates } from '@/lib/seo'
import type { Locale } from '@/i18n/routing'

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'legalCgv' })
  return {
    title: t('title'),
    alternates: buildAlternates('/cgv', locale),
  }
}

export default function CGV({ params }: Props) {
  const { locale } = use(params)
  setRequestLocale(locale)
  const t = useTranslations('legalCgv')
  return (
    <LegalLayout title={t('title')} lastUpdated={t('lastUpdated')}>
      {/* Contenu légal statique, de confiance (rédigé par nous via i18n) */}
      <div dangerouslySetInnerHTML={{ __html: t.raw('body') }} />
    </LegalLayout>
  )
}
