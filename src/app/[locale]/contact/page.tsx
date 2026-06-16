import { useTranslations } from 'next-intl'

export default function Page() {
  const t = useTranslations('common')
  return (
    <div className="flex min-h-[calc(100dvh-72px)] items-center justify-center">
      <p className="text-ink-2 font-mono text-sm">{t('comingSoon')}</p>
    </div>
  )
}
