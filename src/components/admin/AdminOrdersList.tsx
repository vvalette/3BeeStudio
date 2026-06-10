'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ORDER_STATUS_LABELS, formatDestination, type Order, type OrderStatus } from '@/types/order'
import { formatPrice } from '@/lib/utils'
import { STATUS_PILL, STATUS_ACCENT, STATUS_SHORT_LABELS, ALL_STATUSES } from '@/lib/status-ui'
import { DestinationIcon } from '@/components/nfc/NfcLinkPicker'

// ─── Filtres : un par statut + « Toutes » + cas métier « Sans étiquette » ─────

type FilterKey = 'all' | 'no_label' | OrderStatus

const FILTERS: { key: FilterKey; label: string; dot?: string; match: (o: Order) => boolean }[] = [
  { key: 'all', label: 'Toutes', match: () => true },
  ...ALL_STATUSES.map((s) => ({
    key: s as FilterKey,
    label: STATUS_SHORT_LABELS[s],
    dot: STATUS_ACCENT[s],
    match: (o: Order) => o.status === s,
  })),
  {
    key: 'no_label',
    label: 'Sans étiquette',
    dot: '#F59E0B',
    match: (o) => o.status === 'printed' && !o.boxtal_order_id,
  },
]

// ─── Périodes ─────────────────────────────────────────────────────────────────

type Period = 'week' | 'month' | 'year' | 'all'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
  { key: 'all', label: 'Tout' },
]

// Début de la période courante (semaine = lundi 00:00), null = tout.
function periodStart(p: Period): Date | null {
  const now = new Date()
  switch (p) {
    case 'week': {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const day = (d.getDay() + 6) % 7 // 0 = lundi
      d.setDate(d.getDate() - day)
      return d
    }
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'year':  return new Date(now.getFullYear(), 0, 1)
    case 'all':   return null
  }
}

export default function AdminOrdersList({ orders }: { orders: Order[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [period, setPeriod] = useState<Period>('all')
  const [query, setQuery] = useState('')

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin')
    router.refresh()
  }

  // Commandes de la période — base des stats, compteurs et de la liste
  const periodOrders = useMemo(() => {
    const start = periodStart(period)
    if (!start) return orders
    return orders.filter((o) => new Date(o.created_at) >= start)
  }, [orders, period])

  const stats = useMemo(() => {
    const paid = periodOrders.filter((o) => o.status !== 'pending_payment')
    return {
      total: periodOrders.length,
      revenue: paid.reduce((sum, o) => sum + o.total_amount, 0),
      todo: periodOrders.filter((o) => ['confirmed', 'processing', 'printing'].includes(o.status)).length,
      noLabel: periodOrders.filter((o) => o.status === 'printed' && !o.boxtal_order_id).length,
    }
  }, [periodOrders])

  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTERS.map((f) => [f.key, 0])) as Record<FilterKey, number>
    for (const o of periodOrders) {
      for (const f of FILTERS) {
        if (f.match(o)) c[f.key]++
      }
    }
    return c
  }, [periodOrders])

  const filtered = useMemo(() => {
    const active = FILTERS.find((f) => f.key === filter)!
    const q = query.trim().toLowerCase()
    return periodOrders.filter((o) => {
      if (!active.match(o)) return false
      if (!q) return true
      return (
        o.company.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      )
    })
  }, [periodOrders, filter, query])

  const currentYear = new Date().getFullYear()

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-10">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">3BeeStudio · Studio</p>
            <h1 className="mt-1.5 text-2xl font-extrabold text-ink-0" style={{ letterSpacing: '-0.02em' }}>
              Commandes
            </h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex cursor-pointer items-center gap-1.5 rounded-pill border border-[var(--line-2)] px-4 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-ink-1"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 14H3.5A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2H6M11 11l3-3-3-3M14 8H6" />
            </svg>
            Déconnexion
          </button>
        </div>

        {/* Période */}
        <div className="flex items-center justify-between gap-3">
          <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-ink-3 sm:block">
            Vue d&apos;ensemble
          </span>
          <div
            className="grid w-full grid-cols-4 gap-1 rounded-pill p-1 sm:w-auto sm:auto-cols-fr"
            style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}
          >
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={[
                  'cursor-pointer rounded-pill px-4 py-1.5 text-xs font-medium transition-all',
                  period === p.key ? 'bg-amber font-semibold text-bg-0' : 'text-ink-2 hover:text-ink-0',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'Commandes',
              value: String(stats.total),
              accent: '#C9C9CE',
              icon: (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 5l6-3 6 3v6l-6 3-6-3V5z" /><path d="M2 5l6 3 6-3M8 8v6" />
                </svg>
              ),
            },
            {
              label: 'CA encaissé',
              value: formatPrice(stats.revenue),
              accent: '#F59E0B',
              icon: (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.5 4.5a4.5 4.5 0 100 7M2.5 6.8h6M2.5 9.2h6" />
                </svg>
              ),
            },
            {
              label: 'En production',
              value: String(stats.todo),
              accent: '#fb923c',
              icon: (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6V2.5h8V6M4 11H2.5V6h11v5H12M4 9.5h8V14H4V9.5z" />
                </svg>
              ),
            },
            {
              label: 'Étiquettes à faire',
              value: String(stats.noLabel),
              accent: '#a3e635',
              icon: (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.6 1.5H14v5.4l-7 7-5.4-5.4 7-7z" /><circle cx="11" cy="4.6" r="1" fill="currentColor" stroke="none" />
                </svg>
              ),
            },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-bg-1 p-4">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `color-mix(in srgb, ${s.accent} 12%, transparent)`, color: s.accent }}
              >
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate font-mono text-lg font-bold leading-tight" style={{ color: s.accent }}>{s.value}</p>
                <p className="truncate text-[11px] text-ink-3">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtres + recherche */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={[
                  'flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-pill px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === f.key
                    ? 'bg-amber text-bg-0'
                    : 'border border-[var(--line-2)] bg-bg-1 text-ink-2 hover:border-[var(--line-amber)] hover:text-ink-1',
                ].join(' ')}
              >
                {f.dot && (
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: filter === f.key ? 'rgba(10,10,11,0.55)' : f.dot }}
                  />
                )}
                {f.label}
                <span className={['font-mono', filter === f.key ? 'text-bg-0/60' : 'text-ink-3'].join(' ')}>
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative sm:w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Entreprise, email, référence…"
              className="w-full rounded-pill border border-[var(--line-2)] bg-bg-1 py-2 pl-9 pr-3 text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-[var(--line)] bg-bg-1 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-3 text-ink-3">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 5l6-3 6 3v6l-6 3-6-3V5z" /><path d="M2 5l6 3 6-3M8 8v6" />
              </svg>
            </span>
            <p className="mt-4 text-sm font-medium text-ink-1">
              {orders.length === 0 ? 'Aucune commande pour l’instant' : 'Aucune commande ne correspond'}
            </p>
            {orders.length > 0 && (
              <p className="mt-1 text-xs text-ink-3">Essayez un autre filtre, une autre période ou une autre recherche.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((order) => {
              const status = order.status as OrderStatus
              const needsLabel = order.status === 'printed' && !order.boxtal_order_id
              const created = new Date(order.created_at)
              return (
                <Link
                  key={order.id}
                  href={`/admin/commandes/${order.id}`}
                  className="group flex items-stretch overflow-hidden rounded-xl border border-[var(--line)] bg-bg-1 transition-all hover:border-amber/30 hover:bg-bg-2"
                >
                  {/* Accent statut */}
                  <span className="w-[3px] shrink-0" style={{ background: STATUS_ACCENT[status] }} />

                  <div className="flex flex-1 items-center gap-4 py-3.5 pl-4 pr-3">
                    {/* Logo client */}
                    <div
                      className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg sm:flex"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)' }}
                    >
                      {order.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={order.logo_url} alt="" className="h-8 w-8 object-contain" />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#54545A" strokeWidth="1.3">
                          <rect x="2" y="2" width="12" height="12" rx="2" /><circle cx="6" cy="6" r="1.3" /><path d="M2 11l3.5-3.5L9 11l2.5-2.5L14 11" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>

                    {/* Infos principales */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink-0 transition-colors group-hover:text-amber">
                          {order.company}
                        </p>
                        <span className="shrink-0 font-mono text-[10px] text-ink-3">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        {needsLabel && (
                          <span className="shrink-0 rounded-pill border border-amber/40 bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber">
                            Étiquette à générer
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-3">
                        <span className="font-mono text-ink-2">{order.quantity} u.</span> · {order.email}
                      </p>
                      <span
                        className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-pill px-2 py-0.5"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)' }}
                      >
                        <span className="flex shrink-0 text-ink-3"><DestinationIcon value={order.nfc_url} size={10} /></span>
                        <span className="truncate font-mono text-[10px] text-ink-2">{formatDestination(order.nfc_url)}</span>
                      </span>
                    </div>

                    {/* Statut + montant + date */}
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={['rounded-pill px-2.5 py-0.5 text-[11px] font-semibold', STATUS_PILL[status]].join(' ')}>
                        {ORDER_STATUS_LABELS[status]}
                      </span>
                      <span className="font-mono text-sm font-semibold text-ink-0">{formatPrice(order.total_amount)}</span>
                      <span className="text-[10px] text-ink-3">
                        {created.toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          ...(created.getFullYear() !== currentYear ? { year: 'numeric' } : {}),
                        })}
                      </span>
                    </div>

                    {/* Chevron */}
                    <svg
                      className="shrink-0 text-ink-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-amber group-hover:opacity-100"
                      width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <path d="M5 3l4 4-4 4" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
