'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ShopProduct } from '@/types/shop-product'
import type { ShopOrder } from '@/types/shop-order'
import { SHOP_STATUS_LABELS } from '@/types/shop-order'
import { formatPrice } from '@/lib/utils'
import { SHOP_STATUS_PILL, SHOP_STATUS_ACCENT, SHOP_STATUS_SHORT_LABELS, ALL_SHOP_STATUSES } from '@/lib/status-ui'
import Tooltip from '@/components/ui/Tooltip'

type Tab = 'products' | 'orders'
type ShopOrderStatus = ShopOrder['status']

const ORDER_FILTERS: { key: 'all' | 'active' | ShopOrderStatus; label: string; match: (o: ShopOrder) => boolean }[] = [
  { key: 'active', label: 'À traiter', match: (o) => o.status !== 'delivered' && o.status !== 'cancelled' },
  { key: 'all',    label: 'Toutes',    match: () => true },
  ...ALL_SHOP_STATUSES.map((s) => ({
    key: s as ShopOrderStatus,
    label: SHOP_STATUS_SHORT_LABELS[s],
    match: (o: ShopOrder) => o.status === s,
  })),
]

export default function AdminBoutiqueProducts({
  products: initialProducts,
  orders,
  freeShipping: initialFreeShipping,
}: {
  products: ShopProduct[]
  orders: ShopOrder[]
  freeShipping: boolean
}) {
  const router = useRouter()
  const [tab, setTab]                       = useState<Tab>('products')
  const [products, setProducts]             = useState(initialProducts)
  const [orderFilter, setOrderFilter]       = useState<'all' | 'active' | ShopOrderStatus>('active')
  const [orderQuery, setOrderQuery]         = useState('')
  const [togglingId, setTogglingId]         = useState<string | null>(null)
  const [deletingId, setDeletingId]         = useState<string | null>(null)
  const [freeShipping, setFreeShipping]     = useState(initialFreeShipping)
  const [savingShipping, setSavingShipping] = useState(false)

  async function toggleFreeShipping() {
    setSavingShipping(true)
    const next = !freeShipping
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ free_shipping: next }),
    })
    if (res.ok) setFreeShipping(next)
    setSavingShipping(false)
  }

  async function toggleActive(product: ShopProduct) {
    setTogglingId(product.id)
    const res = await fetch(`/api/admin/boutique/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !product.active }),
    })
    if (res.ok) {
      setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, active: !p.active } : p))
    }
    setTogglingId(null)
  }

  async function deleteProduct(product: ShopProduct) {
    if (!confirm(`Supprimer « ${product.name} » ? Il sera archivé dans Stripe.`)) return
    setDeletingId(product.id)
    const res = await fetch(`/api/admin/boutique/products/${product.id}`, { method: 'DELETE' })
    if (res.ok) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
    }
    setDeletingId(null)
  }

  async function updateOrderStatus(orderId: string, status: ShopOrderStatus) {
    await fetch(`/api/admin/boutique/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    router.refresh()
  }

  const filteredOrders = orders.filter((o) => {
    const filter = ORDER_FILTERS.find((f) => f.key === orderFilter)!
    if (!filter.match(o)) return false
    const q = orderQuery.trim().toLowerCase()
    if (!q) return true
    return o.name.toLowerCase().includes(q) || o.email.toLowerCase().includes(q) || o.id.toLowerCase().includes(q)
  })

  const activeCount = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-12">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">3BeeStudio · Admin</p>
            <h1 className="mt-1.5 text-2xl font-extrabold text-ink-0" style={{ letterSpacing: '-0.02em' }}>Boutique</h1>
          </div>
          <Link
            href="/admin/boutique/nouveau"
            className="flex cursor-pointer items-center gap-1.5 rounded-pill bg-amber px-4 py-2 text-xs font-bold text-bg-0 hover:opacity-90 transition-opacity"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M8 2v12M2 8h12" /></svg>
            Nouveau produit
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: 'CA boutique',   value: formatPrice(orders.filter((o) => o.status !== 'pending_payment' && o.status !== 'cancelled').reduce((s, o) => s + o.total_amount, 0)), sub: 'hors annulées', accent: '#38bdf8', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 4.5a4.5 4.5 0 100 7M2.5 6.8h6M2.5 9.2h6" /></svg> },
            { label: 'Commandes',     value: String(orders.length),   sub: `${activeCount} à traiter`,                                                                               accent: '#F59E0B', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12l-1 8H3L2 4z" /><path d="M5 4l1-2h4l1 2" /></svg> },
            { label: 'Produits',      value: String(products.length), sub: `${products.filter((p) => p.active).length} actifs`,                                                      accent: '#C9C9CE', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5l6-3 6 3v6l-6 3-6-3V5z" /><path d="M2 5l6 3 6-3M8 8v6" /></svg> },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-bg-1 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${s.accent} 12%, transparent)`, color: s.accent }}>
                {s.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate font-mono text-lg font-bold leading-tight" style={{ color: s.accent }}>{s.value}</p>
                <p className="truncate text-[11px] text-ink-3">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
          {([
            { key: 'products' as Tab, label: 'Produits',   icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5l6-3 6 3v6l-6 3-6-3V5z" /><path d="M2 5l6 3 6-3M8 8v6" /></svg> },
            { key: 'orders'   as Tab, label: 'Commandes',  icon: <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12l-1 8H3L2 4z" /><path d="M5 4l1-2h4l1 2" /></svg>, badge: activeCount },
          ]).map(({ key, label, icon, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={['flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all', tab === key ? 'bg-bg-0 text-ink-0 shadow-sm' : 'text-ink-3 hover:text-ink-1'].join(' ')}
            >
              <span style={{ color: tab === key ? 'var(--amber)' : 'currentColor' }}>{icon}</span>
              {label}
              {badge !== undefined && badge > 0 && (
                <span className={['rounded-pill px-2 py-0.5 font-mono text-[11px]', tab === key ? 'bg-amber/10 text-amber' : 'bg-bg-3 text-ink-3'].join(' ')}>{badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Onglet Produits ── */}
        {tab === 'products' && (
          <div className="space-y-4">

          {/* Livraison offerte globale */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink-0">Livraison offerte</p>
              <p className="text-[11px] text-ink-3 mt-0.5">
                {freeShipping ? 'Active — livraison gratuite sur toutes les commandes' : 'Inactive — livraison payante selon le seuil habituel'}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleFreeShipping}
              disabled={savingShipping}
              className={[
                'relative flex h-6 w-11 cursor-pointer items-center rounded-full border transition-all duration-200 disabled:opacity-50',
                freeShipping ? 'border-amber bg-amber' : 'border-[var(--line)] bg-bg-3',
              ].join(' ')}
              aria-label={freeShipping ? 'Désactiver la livraison offerte' : 'Activer la livraison offerte'}
            >
              <span className={[
                'absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                freeShipping ? 'translate-x-5' : 'translate-x-1',
              ].join(' ')} />
            </button>
          </div>

          <div className="space-y-2">
            {products.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--line)] py-12 text-center text-ink-3">
                <p className="text-sm">Aucun produit pour l&apos;instant.</p>
                <Link href="/admin/boutique/nouveau" className="mt-3 inline-block text-sm text-amber hover:underline">
                  Créer le premier produit →
                </Link>
              </div>
            )}
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-4 rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3 transition-colors hover:border-[var(--line-2)]"
              >
                {/* Miniature */}
                <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-[var(--line)] bg-bg-2 flex items-center justify-center">
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-3">
                      <rect x="3" y="3" width="18" height="18" rx="3" /><path d="m3 9 4-4 4 4 4-4 4 4" /><circle cx="8" cy="14" r="2" />
                    </svg>
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink-0 truncate">{product.name}</p>
                  <p className="text-[12px] text-ink-3 truncate">
                    /boutique/{product.slug} ·{' '}
                    {product.sale_price !== null ? (
                      <>
                        <span className="text-amber">{formatPrice(product.sale_price)}</span>
                        <span className="line-through ml-1">{formatPrice(product.price)}</span>
                      </>
                    ) : formatPrice(product.price)}
                    {' '}· {product.stock !== null ? `${product.stock} en stock` : 'stock illimité'}
                  </p>
                </div>

                {/* Statut */}
                <span className={['rounded-pill px-2.5 py-0.5 text-[11px] font-medium', product.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'].join(' ')}>
                  {product.active ? 'Actif' : 'Inactif'}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Tooltip content={product.active ? 'Désactiver' : 'Activer'}>
                    <button
                      onClick={() => toggleActive(product)}
                      disabled={togglingId === product.id}
                      className="cursor-pointer rounded-lg p-2 text-ink-3 hover:bg-bg-2 hover:text-ink-1 transition-colors disabled:opacity-40"
                    >
                      {product.active ? (
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 8h12M8 2l-3 6 3 6" /></svg>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 8h10M8 4l4 4-4 4" /></svg>
                      )}
                    </button>
                  </Tooltip>
                  <Tooltip content="Modifier">
                    <Link
                      href={`/admin/boutique/${product.id}`}
                      className="rounded-lg p-2 text-ink-3 hover:bg-bg-2 hover:text-ink-1 transition-colors"
                    >
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11.5 2.5a1.5 1.5 0 012 2L5 13H2v-3L11.5 2.5z" />
                      </svg>
                    </Link>
                  </Tooltip>
                  <Tooltip content="Supprimer" side="left">
                    <button
                      onClick={() => deleteProduct(product)}
                      disabled={deletingId === product.id}
                      className="cursor-pointer rounded-lg p-2 text-ink-3 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-40"
                    >
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" />
                      </svg>
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
          </div>
        )}

        {/* ── Onglet Commandes ── */}
        {tab === 'orders' && (
          <div className="space-y-4">
            {/* Filtres */}
            <div className="flex flex-wrap gap-2">
              {ORDER_FILTERS.map((f) => {
                const count = orders.filter(f.match).length
                const active = orderFilter === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => setOrderFilter(f.key)}
                    className={[
                      'cursor-pointer flex items-center gap-1.5 rounded-pill border px-3 py-1 text-[12px] font-medium transition-all',
                      active ? 'bg-amber border-amber text-bg-0' : 'border-[var(--line)] text-ink-2 hover:text-ink-0',
                    ].join(' ')}
                  >
                    {f.label}
                    <span className={['font-mono text-[10px]', active ? 'text-bg-0' : 'text-ink-3'].join(' ')}>{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Recherche */}
            <input
              className="w-full rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-2 text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none focus:border-amber transition-colors"
              placeholder="Rechercher nom, email, ID…"
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
            />

            {/* Liste */}
            {filteredOrders.length === 0 && (
              <p className="py-8 text-center text-sm text-ink-3">Aucune commande pour ce filtre.</p>
            )}
            {filteredOrders.map((order) => (
              <div key={order.id} className="rounded-xl border border-[var(--line)] bg-bg-1 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-0">{order.name}</p>
                    <p className="text-[12px] text-ink-3">{order.email} · #{order.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[12px] text-ink-3 mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' · '}{formatPrice(order.total_amount)}
                    </p>
                  </div>
                  <span className={['rounded-pill px-2.5 py-0.5 text-[11px] font-medium shrink-0', SHOP_STATUS_PILL[order.status]].join(' ')}>
                    {SHOP_STATUS_LABELS[order.status]}
                  </span>
                </div>

                {/* Articles */}
                <div className="space-y-1">
                  {order.items.map((item, i) => (
                    <p key={i} className="text-[12px] text-ink-2">
                      {item.quantity}× {item.product_name} — {formatPrice(item.unit_price * item.quantity)}
                    </p>
                  ))}
                </div>

                {/* Livraison */}
                {order.shipping_city && (
                  <p className="text-[12px] text-ink-3">
                    📦 {order.shipping_name} · {order.shipping_city} {order.shipping_postal_code}
                    {order.tracking_number && (
                      <> · <a href={order.tracking_url ?? '#'} target="_blank" rel="noopener noreferrer" className="text-amber hover:underline">{order.tracking_number}</a></>
                    )}
                  </p>
                )}

                {/* Changement de statut */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as ShopOrderStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateOrderStatus(order.id, s)}
                      disabled={order.status === s}
                      className={[
                        'cursor-pointer rounded-pill border px-2.5 py-0.5 text-[11px] font-medium transition-all disabled:opacity-30',
                        order.status === s ? SHOP_STATUS_PILL[s] : 'border-[var(--line)] text-ink-3 hover:text-ink-1',
                      ].join(' ')}
                      style={order.status === s ? {} : {}}
                    >
                      {SHOP_STATUS_SHORT_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
