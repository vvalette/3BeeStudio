import { useTranslations } from 'next-intl'

export default function Page() {
  const t = useTranslations('common')
  return (
    <div className="flex min-h-[calc(100dvh-72px)] items-center justify-center">
      <p className="text-zinc-600 font-syne">{t('comingSoon')}</p>
    </div>
  )
}
