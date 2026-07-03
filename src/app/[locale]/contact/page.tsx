import { use } from 'react'
import { setRequestLocale } from 'next-intl/server'
import { useTranslations } from 'next-intl'
import type { Locale } from '@/i18n/routing'

type Props = { params: Promise<{ locale: Locale }> }

export default function Page({ params }: Props) {
  const { locale } = use(params)
  setRequestLocale(locale)
  const t = useTranslations('common')
  return (
    <div className="flex min-h-[calc(100dvh-72px)] items-center justify-center">
      <p className="text-ink-2 font-mono text-sm">{t('comingSoon')}</p>
    </div>
  )
}
