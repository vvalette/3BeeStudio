'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'

export interface SelectedRelay {
  code: string
  name: string
  street: string
  city: string
  postalCode: string
}

interface ParcelPoint extends SelectedRelay {
  distanceMeters: number | null
  openingDays: Record<string, { openingTime: string; closingTime: string }[]>
}

const DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const

/** « Lun–Sam » : plage de jours ouverts, suffisant pour choisir un relais. */
function openDaysSummary(days: ParcelPoint['openingDays'], short: string[]): string | null {
  const open = DAY_ORDER.map((d, i) => ((days[d]?.length ?? 0) > 0 ? i : -1)).filter((i) => i >= 0)
  if (open.length === 0) return null
  const first = open[0]
  const last = open[open.length - 1]
  // Contigu → plage ; sinon liste les jours
  const contiguous = open.every((v, i) => v === first + i)
  return contiguous && open.length > 1
    ? `${short[first]}–${short[last]}`
    : open.map((i) => short[i]).join(', ')
}

export default function RelayPicker({
  postalCode,
  city,
  street,
  selected,
  onSelect,
}: {
  postalCode: string
  city: string
  street: string
  selected: SelectedRelay | null
  onSelect: (relay: SelectedRelay | null) => void
}) {
  const t = useTranslations('boutique.checkoutForm.relay')
  const [points, setPoints] = useState<ParcelPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const shortDays = [t('days.mon'), t('days.tue'), t('days.wed'), t('days.thu'), t('days.fri'), t('days.sat'), t('days.sun')]

  // Évite de relancer la même recherche (l'API Boxtal est facturée à l'appel)
  const lastQuery = useRef<string>('')

  const search = useCallback(async () => {
    if (!/^\d{5}$/.test(postalCode)) return
    const query = `${postalCode}|${city}|${street}`
    if (query === lastQuery.current) return
    lastQuery.current = query

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ postalCode })
      if (city) params.set('city', city)
      if (street) params.set('street', street)
      const res = await fetch(`/api/boutique/parcel-points?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('errorGeneric'))
      setPoints(data.points ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'))
      setPoints([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [postalCode, city, street, t])

  // Recherche automatique dès que le code postal est complet, sans spammer l'API
  useEffect(() => {
    if (!/^\d{5}$/.test(postalCode)) {
      setPoints([])
      setSearched(false)
      lastQuery.current = ''
      return
    }
    const timer = setTimeout(search, 700)
    return () => clearTimeout(timer)
  }, [postalCode, city, street, search])

  // Un relais choisi puis code postal modifié = relais qui ne correspond plus
  useEffect(() => {
    if (selected && points.length > 0 && !points.some((p) => p.code === selected.code)) {
      onSelect(null)
    }
  }, [points, selected, onSelect])

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{t('title')}</p>
        {points.length > 0 && (
          <span className="font-mono text-[11px] text-ink-3">{t('count', { count: points.length })}</span>
        )}
      </div>

      {!/^\d{5}$/.test(postalCode) ? (
        <p className="rounded-lg border border-dashed border-[var(--line)] px-3.5 py-3 text-[13px] text-ink-3">
          {t('enterPostal')}
        </p>
      ) : loading ? (
        <p className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-bg-1 px-3.5 py-3 text-[13px] text-ink-2">
          <svg className="animate-spin shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" />
          </svg>
          {t('searching')}
        </p>
      ) : error ? (
        <div className="rounded-lg border border-red-500/25 bg-red-500/8 px-3.5 py-3 text-[13px] text-red-400">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => { lastQuery.current = ''; search() }}
            className="mt-1.5 cursor-pointer font-semibold underline hover:no-underline"
          >
            {t('retry')}
          </button>
        </div>
      ) : searched && points.length === 0 ? (
        <p className="rounded-lg border border-amber/25 bg-amber/5 px-3.5 py-3 text-[13px] text-ink-2">
          {t('noneFound')}
        </p>
      ) : (
        <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-0.5">
          {points.map((p) => {
            const isSelected = selected?.code === p.code
            const hours = openDaysSummary(p.openingDays, shortDays)
            return (
              <li key={p.code}>
                <button
                  type="button"
                  onClick={() => onSelect({
                    code: p.code, name: p.name, street: p.street,
                    city: p.city, postalCode: p.postalCode,
                  })}
                  aria-pressed={isSelected}
                  className={[
                    'flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all',
                    isSelected
                      ? 'border-amber bg-amber/8'
                      : 'border-[var(--line)] bg-bg-1 hover:border-[var(--line-2)]',
                  ].join(' ')}
                >
                  <span className={[
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                    isSelected ? 'bg-amber/15 text-amber' : 'bg-bg-2 text-ink-3',
                  ].join(' ')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className={['block text-[13px] font-semibold leading-tight', isSelected ? 'text-ink-0' : 'text-ink-1'].join(' ')}>
                      {p.name}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">
                      {p.street}, {p.postalCode} {p.city}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-ink-3">
                      {p.distanceMeters !== null && (
                        <span className="text-amber">
                          {p.distanceMeters < 1000
                            ? t('distanceMeters', { value: p.distanceMeters })
                            : t('distanceKm', { value: (p.distanceMeters / 1000).toFixed(1) })}
                        </span>
                      )}
                      {hours && <span>{hours}</span>}
                    </span>
                  </span>

                  {isSelected && (
                    <svg className="mt-0.5 shrink-0 text-amber" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                      <path d="M3 8l3.5 3.5L13 5" />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
