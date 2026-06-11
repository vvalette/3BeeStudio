'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'

export default function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const targetLocale = locale === 'fr' ? 'en' : 'fr'
  const label = locale === 'fr' ? 'EN' : 'FR'

  const handleSwitch = () => {
    router.replace(pathname, { locale: targetLocale })
  }

  return (
    <button
      onClick={handleSwitch}
      aria-label={`Switch to ${targetLocale.toUpperCase()}`}
      className="flex h-8 items-center rounded-md border border-[var(--line)] bg-bg-2 px-2.5 font-mono text-[11px] font-semibold text-ink-2 tracking-widest transition-all hover:border-[var(--line-amber)] hover:text-amber cursor-pointer"
    >
      {label}
    </button>
  )
}
