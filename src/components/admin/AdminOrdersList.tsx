'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ORDER_STATUS_LABELS, type Order, type OrderStatus } from '@/types/order'
import { formatPrice } from '@/lib/utils'

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: 'bg-zinc-500/20 text-zinc-400',
  confirmed: 'bg-blue-500/20 text-blue-400',
  processing: 'bg-purple-500/20 text-purple-400',
  printing: 'bg-orange-500/20 text-orange-400',
  shipped: 'bg-cyan-500/20 text-cyan-400',
  delivered: 'bg-emerald-500/20 text-emerald-400',
}

export default function AdminOrdersList({ orders }: { orders: Order[] }) {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin')
    router.refresh()
  }

  const stats = {
    total: orders.length,
    confirmed: orders.filter((o) => o.status === 'confirmed').length,
    printing: orders.filter((o) => o.status === 'printing').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink-0">🐝 Commandes</h1>
            <p className="text-sm text-ink-3">{orders.length} commande{orders.length > 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-[var(--line-2)] px-4 py-2 text-sm text-ink-2 hover:text-ink-1 transition-colors"
          >
            Déconnexion
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-ink-1' },
            { label: 'Confirmées', value: stats.confirmed, color: 'text-blue-400' },
            { label: 'En impression', value: stats.printing, color: 'text-orange-400' },
            { label: 'Expédiées', value: stats.shipped, color: 'text-cyan-400' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--line)] bg-bg-1 p-4">
              <p className={['text-2xl font-bold', s.color].join(' ')}>{s.value}</p>
              <p className="text-xs text-ink-3">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Liste */}
        {orders.length === 0 ? (
          <div className="rounded-xl border border-[var(--line)] bg-bg-1 p-12 text-center">
            <p className="text-ink-3">Aucune commande pour l&apos;instant</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/commandes/${order.id}`}
                className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-bg-1 p-4 hover:border-amber/30 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium text-ink-0 group-hover:text-amber transition-colors">
                      {order.company}
                    </p>
                    <p className="text-xs text-ink-3">
                      {order.quantity} u. · {order.email} · {new Date(order.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden text-sm text-ink-2 sm:block">
                    {formatPrice(order.total_amount)}
                  </span>
                  <span className={['rounded-pill px-3 py-1 text-xs font-semibold', STATUS_COLORS[order.status as OrderStatus]].join(' ')}>
                    {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                  </span>
                  <span className="text-ink-3">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
