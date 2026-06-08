'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ORDER_STATUS_LABELS, formatDestination, type Order, type OrderStatus } from '@/types/order'
import { formatPrice } from '@/lib/utils'

const STATUS_PILL: Record<OrderStatus, string> = {
  pending_payment: 'bg-zinc-500/20 text-zinc-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-purple-500/20 text-purple-400',
  printing: 'bg-orange-500/20 text-orange-400',
  shipped: 'bg-cyan-500/20 text-cyan-400',
  delivered: 'bg-emerald-500/20 text-emerald-400',
}

// Couleur d'accent (barre gauche) par statut.
const STATUS_ACCENT: Record<OrderStatus, string> = {
  pending_payment: '#71717a',
  confirmed: '#60a5fa',
  processing: '#c084fc',
  printing: '#fb923c',
  shipped: '#22d3ee',
  delivered: '#34d399',
}

type FilterKey = 'all' | 'todo' | 'shipped' | 'delivered' | 'pending'

const FILTERS: { key: FilterKey; label: string; match: (s: OrderStatus) => boolean }[] = [
  { key: 'all', label: 'Toutes', match: () => true },
  { key: 'todo', label: 'À traiter', match: (s) => s === 'confirmed' || s === 'processing' || s === 'printing' },
  { key: 'shipped', label: 'Expédiées', match: (s) => s === 'shipped' },
  { key: 'delivered', label: 'Livrées', match: (s) => s === 'delivered' },
  { key: 'pending', label: 'Impayées', match: (s) => s === 'pending_payment' },
]

export default function AdminOrdersList({ orders }: { orders: Order[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin')
    router.refresh()
  }

  const stats = useMemo(() => {
    const paid = orders.filter((o) => o.status !== 'pending_payment')
    return {
      total: orders.length,
      revenue: paid.reduce((sum, o) => sum + o.total_amount, 0),
      todo: orders.filter((o) => ['confirmed', 'processing', 'printing'].includes(o.status)).length,
      shipped: orders.filter((o) => o.status === 'shipped').length,
    }
  }, [orders])

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: 0, todo: 0, shipped: 0, delivered: 0, pending: 0 }
    for (const o of orders) {
      for (const f of FILTERS) {
        if (f.match(o.status as OrderStatus)) c[f.key]++
      }
    }
    return c
  }, [orders])

  const filtered = useMemo(() => {
    const active = FILTERS.find((f) => f.key === filter)!
    const q = query.trim().toLowerCase()
    return orders.filter((o) => {
      if (!active.match(o.status as OrderStatus)) return false
      if (!q) return true
      return (
        o.company.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      )
    })
  }, [orders, filter, query])

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-10">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink-0">🐝 Commandes</h1>
            <p className="text-sm text-ink-3">{orders.length} commande{orders.length > 1 ? 's' : ''} au total</p>
          </div>
          <button
            onClick={handleLogout}
            className="cursor-pointer rounded-lg border border-[var(--line-2)] px-4 py-2 text-sm text-ink-2 hover:text-ink-1 transition-colors"
          >
            Déconnexion
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total', value: String(stats.total), color: 'text-ink-1' },
            { label: 'CA encaissé', value: formatPrice(stats.revenue), color: 'text-amber' },
            { label: 'À traiter', value: String(stats.todo), color: 'text-orange-400' },
            { label: 'Expédiées', value: String(stats.shipped), color: 'text-cyan-400' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--line)] bg-bg-1 p-4">
              <p className={['text-xl font-bold sm:text-2xl', s.color].join(' ')}>{s.value}</p>
              <p className="text-xs text-ink-3">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtres + recherche */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={[
                  'cursor-pointer whitespace-nowrap rounded-pill px-3 py-1.5 text-xs font-medium transition-colors',
                  filter === f.key
                    ? 'bg-amber text-bg-0'
                    : 'border border-[var(--line-2)] text-ink-2 hover:text-ink-1',
                ].join(' ')}
              >
                {f.label}
                <span className={['ml-1.5', filter === f.key ? 'text-bg-0/60' : 'text-ink-3'].join(' ')}>
                  {counts[f.key]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative sm:w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (entreprise, email…)"
              className="w-full rounded-lg border border-[var(--line-2)] bg-bg-2 py-2 pl-9 pr-3 text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-[var(--line)] bg-bg-1 p-12 text-center">
            <p className="text-ink-3">
              {orders.length === 0 ? 'Aucune commande pour l’instant' : 'Aucune commande ne correspond'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((order) => {
              const status = order.status as OrderStatus
              return (
                <Link
                  key={order.id}
                  href={`/admin/commandes/${order.id}`}
                  className="group flex items-stretch gap-3 overflow-hidden rounded-xl border border-[var(--line)] bg-bg-1 hover:border-amber/30 transition-colors"
                >
                  {/* Accent statut */}
                  <span className="w-1 shrink-0" style={{ background: STATUS_ACCENT[status] }} />

                  <div className="flex flex-1 items-center justify-between gap-3 py-3 pr-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-ink-0 group-hover:text-amber transition-colors">
                          {order.company}
                        </p>
                        <span className="shrink-0 font-mono text-[10px] text-ink-3">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <p className="truncate text-xs text-ink-3">
                        {order.quantity} u. · {order.email}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-ink-3">
                        ↪ {formatDestination(order.nfc_url)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className={['rounded-pill px-2.5 py-0.5 text-[11px] font-semibold', STATUS_PILL[status]].join(' ')}>
                        {ORDER_STATUS_LABELS[status]}
                      </span>
                      <span className="text-sm font-medium text-ink-1">{formatPrice(order.total_amount)}</span>
                      <span className="text-[10px] text-ink-3">
                        {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
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
