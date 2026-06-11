import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import LegalLayout from '@/components/ui/LegalLayout'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'legalCgv' })
  return { title: t('title') }
}

export default function CGV() {
  const t = useTranslations('legalCgv')
  return (
    <LegalLayout title={t('title')} lastUpdated={t('lastUpdated')}>
      {/* Contenu légal statique, de confiance (rédigé par nous via i18n) */}
      <div dangerouslySetInnerHTML={{ __html: t.raw('body') }} />
    </LegalLayout>
  )
}
