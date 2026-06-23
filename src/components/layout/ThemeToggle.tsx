'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import Tooltip from '@/components/ui/Tooltip'

export default function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('nav')
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Évite le mismatch d'hydratation : le thème réel n'est connu que côté client.
  useEffect(() => setMounted(true), [])

  const isDark = resolvedTheme === 'dark'
  const label = isDark ? t('switchToLight') : t('switchToDark')

  return (
    <Tooltip content={label} side="bottom">
      <button
        type="button"
        aria-label={label}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-md border border-[var(--line)] bg-bg-2 text-ink-1 transition-colors hover:bg-bg-3 hover:text-ink-0 cursor-pointer',
          className
        )}
      >
        {/* Rendu neutre avant montage pour ne pas figer la mauvaise icône au SSR */}
        {mounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : <Moon size={18} className="opacity-0" />}
      </button>
    </Tooltip>
  )
}
