'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ShopProduct } from '@/types/shop-product'
import type { ShopOrder } from '@/types/shop-order'
import { formatPrice } from '@/lib/utils'
import { LOW_STOCK_THRESHOLD, isLowStock, isOutOfStock } from '@/lib/stock'
import Tooltip from '@/components/ui/Tooltip'
import { useConfirm } from '@/components/ui/ConfirmModal'
import { useAdminMutation } from './useAdminMutation'
import AdminFeedback from './AdminFeedback'

/**
 * Écran produits de la boutique.
 *
 * Les commandes boutique vivaient aussi ici, dans un second onglet qui dupliquait
 * `/admin/commandes` avec d'autres filtres, un autre tri et une autre UI. Un seul
 * écran de commandes désormais : celui-là ne garde que le catalogue, et renvoie
 * vers `/admin/commandes` pour le reste.
 */
/** Projection minimale des commandes : cet écran n'en affiche que deux compteurs. */
export type OrderStat = Pick<ShopOrder, 'status' | 'total_amount'>

export default function AdminBoutiqueProducts({
  products: initialProducts,
  orderStats,
  freeShipping: initialFreeShipping,
}: {
  products: ShopProduct[]
  orderStats: OrderStat[]
  freeShipping: boolean
}) {
  const router = useRouter()
  const { confirm, modal } = useConfirm()
  const { mutate, error: mutationError, success, clear } = useAdminMutation()
  const [products, setProducts]         = useState(initialProducts)
  const [busyId, setBusyId]             = useState<string | null>(null)
  const [freeShipping, setFreeShipping] = useState(initialFreeShipping)
  const [query, setQuery]               = useState('')

  async function toggleFreeShipping() {
    const next = !freeShipping
    setBusyId('settings')
    const ok = await mutate('/api/admin/settings', {
      method: 'PUT',
      body: { free_shipping: next },
      successMessage: next ? 'Livraison offerte activée' : 'Livraison offerte désactivée',
    })
    setBusyId(null)
    if (ok) setFreeShipping(next)
  }

  async function toggleActive(product: ShopProduct) {
    setBusyId(product.id)
    const ok = await mutate(`/api/admin/boutique/products/${product.id}`, {
      body: { active: !product.active },
      successMessage: product.active ? `« ${product.name} » désactivé` : `« ${product.name} » activé`,
    })
    setBusyId(null)
    if (ok) setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, active: !p.active } : p))
  }

  async function updateStock(product: ShopProduct, stock: number) {
    setBusyId(product.id)
    const ok = await mutate(`/api/admin/boutique/products/${product.id}`, {
      body: { stock },
      successMessage: `Stock de « ${product.name} » : ${stock}`,
    })
    setBusyId(null)
    if (ok) setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, stock } : p))
  }

  async function duplicateProduct(product: ShopProduct) {
    setBusyId(product.id)
    const created = await mutate<ShopProduct>(`/api/admin/boutique/products/${product.id}/duplicate`, {
      method: 'POST',
      refresh: false,
    })
    setBusyId(null)
    if (created) router.push(`/admin/boutique/${created.id}`)
  }

  async function deleteProduct(product: ShopProduct) {
    if (!await confirm({ title: `Supprimer « ${product.name} » ?`, message: 'Il sera archivé dans Stripe.', confirmLabel: 'Supprimer', variant: 'danger' })) return
    setBusyId(product.id)
    const ok = await mutate(`/api/admin/boutique/products/${product.id}`, {
      method: 'DELETE',
      successMessage: `« ${product.name} » supprimé`,
    })
    setBusyId(null)
    if (ok) setProducts((prev) => prev.filter((p) => p.id !== product.id))
  }

  const q = query.trim().toLowerCase()
  const filtered = q
    ? products.filter((p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q) || (p.category ?? '').toLowerCase().includes(q))
    : products

  const lowStock    = products.filter((p) => isLowStock(p.stock))
  const activeCount = orderStats.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length
  const revenue     = orderStats
    .filter((o) => o.status !== 'pending_payment' && o.status !== 'cancelled')
    .reduce((s, o) => s + o.total_amount, 0)

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-12">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">3BeeStudio · Admin</p>
            <h1 className="mt-1.5 text-xl font-extrabold text-ink-0 sm:text-2xl" style={{ letterSpacing: '-0.02em' }}>Produits</h1>
          </div>
          <Link
            href="/admin/boutique/nouveau"
            className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-pill bg-amber px-3 py-2 text-xs font-bold text-bg-0 hover:opacity-90 transition-opacity sm:px-4"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M8 2v12M2 8h12" /></svg>
            Nouveau produit
          </Link>
        </div>

        <AdminFeedback error={mutationError} success={success} onDismiss={clear} />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="CA boutique" value={formatPrice(revenue)} accent="#38bdf8"
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 4.5a4.5 4.5 0 100 7M2.5 6.8h6M2.5 9.2h6" /></svg>} />
          <StatCard label="Produits actifs" value={`${products.filter((p) => p.active).length}/${products.length}`} accent="var(--ink-1)"
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5l6-3 6 3v6l-6 3-6-3V5z" /><path d="M2 5l6 3 6-3M8 8v6" /></svg>} />
          <StatCard label={`Stocks ≤ ${LOW_STOCK_THRESHOLD}`} value={String(lowStock.length)} accent={lowStock.length > 0 ? '#fb923c' : 'var(--ink-1)'}
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2.5l5.5 10h-11L8 2.5z" /><path d="M8 6.5v3M8 11.5v.01" /></svg>} />
          <Link href="/admin/commandes" className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-bg-1 p-4 transition-colors hover:border-[var(--line-amber)]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)', color: '#F59E0B' }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12l-1 8H3L2 4z" /><path d="M5 4l1-2h4l1 2" /></svg>
            </span>
            <div className="min-w-0">
              <p className="truncate font-mono text-lg font-bold leading-tight text-amber">{activeCount}</p>
              <p className="truncate text-[11px] text-ink-3">Commandes à traiter →</p>
            </div>
          </Link>
        </div>

        {/* Alerte stocks bas */}
        {lowStock.length > 0 && (
          <div className="rounded-xl border border-orange-500/25 bg-orange-500/5 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
              {lowStock.length === 1 ? 'Un produit à réimprimer' : `${lowStock.length} produits à réimprimer`}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              {lowStock.map((p) => `${p.name} (${p.stock})`).join(' · ')}
            </p>
          </div>
        )}

        {/* Livraison offerte globale */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-0">Livraison offerte</p>
            <p className="text-[11px] text-ink-3 mt-0.5">
              {freeShipping ? 'Active — livraison gratuite sur toutes les commandes' : 'Inactive — livraison payante selon le seuil habituel'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleFreeShipping}
            disabled={busyId === 'settings'}
            className={[
              'relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-all duration-200 disabled:opacity-50',
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

        {/* Recherche produits */}
        {products.length > 4 && (
          <input
            className="w-full rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-2 text-sm text-ink-0 placeholder:text-ink-3 transition-colors focus:border-amber focus:outline-none"
            placeholder="Rechercher un produit, un slug, une catégorie…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}

        {/* Liste produits */}
        <div className="space-y-2">
          {products.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--line)] py-12 text-center text-ink-3">
              <p className="text-sm">Aucun produit pour l&apos;instant.</p>
              <Link href="/admin/boutique/nouveau" className="mt-3 inline-block text-sm text-amber hover:underline">
                Créer le premier produit →
              </Link>
            </div>
          )}
          {products.length > 0 && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-3">Aucun produit ne correspond à « {query} ».</p>
          )}
          {filtered.map((product) => {
            const busy = busyId === product.id
            return (
              <div
                key={product.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3 transition-colors hover:border-[var(--line-2)] sm:flex-nowrap sm:gap-4"
              >
                {/* Miniature */}
                <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden border border-[var(--line)] bg-bg-2 flex items-center justify-center">
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.images[0]} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
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
                  </p>
                </div>

                {/* Stock éditable */}
                <StockControl product={product} busy={busy} onChange={(next) => updateStock(product, next)} />

                {/* Statut + actions — passent sous les infos sur mobile */}
                <div className="flex w-full items-center justify-end gap-1 sm:w-auto sm:contents">
                  <span className={['shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-medium', product.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'].join(' ')}>
                    {product.active ? 'Actif' : 'Inactif'}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <Tooltip content={product.active ? 'Désactiver' : 'Activer'}>
                      <button
                        onClick={() => toggleActive(product)}
                        disabled={busy}
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
                    <Tooltip content="Dupliquer">
                      <button
                        onClick={() => duplicateProduct(product)}
                        disabled={busy}
                        className="cursor-pointer rounded-lg p-2 text-ink-3 hover:bg-bg-2 hover:text-ink-1 transition-colors disabled:opacity-40"
                      >
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                          <path d="M10.5 5.5V4A1.5 1.5 0 009 2.5H4A1.5 1.5 0 002.5 4v5A1.5 1.5 0 004 10.5h1.5" />
                        </svg>
                      </button>
                    </Tooltip>
                    <Tooltip content="Supprimer" side="left">
                      <button
                        onClick={() => deleteProduct(product)}
                        disabled={busy}
                        className="cursor-pointer rounded-lg p-2 text-ink-3 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" />
                        </svg>
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {modal}
    </main>
  )
}

function StatCard({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-bg-1 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate font-mono text-lg font-bold leading-tight" style={{ color: accent }}>{value}</p>
        <p className="truncate text-[11px] text-ink-3">{label}</p>
      </div>
    </div>
  )
}

/**
 * Stock modifiable sans ouvrir le formulaire produit : après une impression ou une
 * expédition manuelle, corriger le stock demandait 4 clics et un submit complet.
 *
 * `stock: null` = imprimé à la commande, pas de compteur → affiché en lecture seule
 * (basculer illimité ↔ limité reste une décision produit, donc dans le formulaire).
 */
function StockControl({
  product,
  busy,
  onChange,
}: {
  product: ShopProduct
  busy: boolean
  onChange: (stock: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  if (product.stock === null) {
    return (
      <Tooltip content="Imprimé à la commande — pas de compteur de stock">
        <span className="shrink-0 rounded-pill border border-[var(--line)] px-2.5 py-0.5 font-mono text-[11px] text-ink-3">
          ∞ stock
        </span>
      </Tooltip>
    )
  }

  const stock = product.stock
  const out   = isOutOfStock(stock)
  const low   = isLowStock(stock)

  function commit() {
    if (draft === null) return
    const parsed = Number.parseInt(draft, 10)
    setDraft(null)
    if (Number.isFinite(parsed) && parsed >= 0 && parsed !== stock) onChange(parsed)
  }

  return (
    <div
      className={[
        'flex shrink-0 items-center gap-0.5 rounded-pill border px-1',
        out ? 'border-red-500/30 bg-red-500/5'
          : low ? 'border-orange-500/30 bg-orange-500/5'
            : 'border-[var(--line)]',
      ].join(' ')}
    >
      <Tooltip content="Retirer 1">
        <button
          onClick={() => onChange(stock - 1)}
          disabled={busy || stock === 0}
          aria-label="Retirer une unité du stock"
          className="cursor-pointer rounded-full px-1.5 py-1 text-ink-3 transition-colors hover:text-ink-0 disabled:cursor-default disabled:opacity-30"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2.5 6h7" /></svg>
        </button>
      </Tooltip>

      <input
        value={draft ?? String(stock)}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.currentTarget.blur() }
          if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur() }
        }}
        disabled={busy}
        inputMode="numeric"
        aria-label={`Stock de ${product.name}`}
        className={[
          'w-9 bg-transparent text-center font-mono text-[12px] font-bold tabular-nums focus:outline-none',
          out ? 'text-red-400' : low ? 'text-orange-400' : 'text-ink-1',
        ].join(' ')}
      />

      <Tooltip content="Ajouter 1">
        <button
          onClick={() => onChange(stock + 1)}
          disabled={busy}
          aria-label="Ajouter une unité au stock"
          className="cursor-pointer rounded-full px-1.5 py-1 text-ink-3 transition-colors hover:text-ink-0 disabled:cursor-default disabled:opacity-30"
        >
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 2.5v7M2.5 6h7" /></svg>
        </button>
      </Tooltip>
    </div>
  )
}
