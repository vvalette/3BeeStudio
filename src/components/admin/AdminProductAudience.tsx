'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ShopProduct } from '@/types/shop-product'
import type { DayPoint, ProductStats } from '@/lib/product-stats'
import { emptyStats } from '@/lib/product-stats'
import { formatPrice } from '@/lib/utils'
import Tooltip from '@/components/ui/Tooltip'

/**
 * Audience des fiches produit.
 *
 * L'écran répond à une question que les ventes seules ne savent pas trancher :
 * un produit qui ne se vend pas est-il invisible (personne ne le consulte) ou
 * décevant (beaucoup de vues, aucun panier) ? Les deux se corrigent autrement —
 * l'un par l'acquisition, l'autre par la fiche, le prix ou les photos.
 *
 * Les trois fenêtres arrivent calculées du serveur : basculer 7 j ↔ 90 j est
 * instantané et ne recharge rien.
 */

export const AUDIENCE_WINDOWS = [7, 30, 90] as const
export type AudienceWindow = (typeof AUDIENCE_WINDOWS)[number]

export type AudienceProduct = Pick<
  ShopProduct,
  'id' | 'name' | 'slug' | 'images' | 'active' | 'product_type' | 'price' | 'sale_price'
>

export type AudienceWindows = Record<
  AudienceWindow,
  { stats: Record<string, ProductStats>; series: DayPoint[] }
>

type SortKey = 'views' | 'conversion' | 'orders' | 'carts' | 'trend'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'views',      label: 'Vues' },
  { key: 'conversion', label: 'Conversion' },
  { key: 'orders',     label: 'Ventes' },
  { key: 'carts',      label: 'Paniers' },
  { key: 'trend',      label: 'Tendance' },
]

const nf = new Intl.NumberFormat('fr-FR')
const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' })

function formatDay(day: string): string {
  return dayFormat.format(new Date(`${day}T12:00:00Z`))
}

function formatPct(value: number | null, digits = 1): string {
  if (value === null) return '—'
  return `${(value * 100).toFixed(digits).replace('.', ',')} %`
}

export default function AdminProductAudience({
  products,
  windows,
  measuring,
}: {
  products: AudienceProduct[]
  windows: AudienceWindows
  measuring: boolean
}) {
  const [window, setWindow] = useState<AudienceWindow>(30)
  const [sort, setSort] = useState<SortKey>('views')

  const { stats, series } = windows[window]

  const rows = useMemo(() => {
    const list = products.map((product) => ({
      product,
      s: stats[product.id] ?? emptyStats(window),
    }))
    return list.sort((a, b) => {
      switch (sort) {
        case 'conversion': return (b.s.conversion ?? -1) - (a.s.conversion ?? -1)
        case 'orders':     return b.s.orders - a.s.orders || b.s.views - a.s.views
        case 'carts':      return b.s.carts - a.s.carts || b.s.views - a.s.views
        case 'trend':      return (b.s.trend ?? -Infinity) - (a.s.trend ?? -Infinity)
        default:           return b.s.views - a.s.views
      }
    })
  }, [products, stats, sort, window])

  const total = useMemo(
    () => series.reduce(
      (acc, p) => ({ views: acc.views + p.views, uniques: acc.uniques + p.uniques, carts: acc.carts + p.carts }),
      { views: 0, uniques: 0, carts: 0 },
    ),
    [series],
  )
  const totalOrders = useMemo(() => rows.reduce((sum, r) => sum + r.s.orders, 0), [rows])
  const conversion  = total.uniques > 0 ? totalOrders / total.uniques : null

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-12">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">3BeeStudio · Admin</p>
            <h1 className="mt-1.5 text-xl font-extrabold text-ink-0 sm:text-2xl" style={{ letterSpacing: '-0.02em' }}>
              Audience boutique
            </h1>
          </div>
          <Link
            href="/admin/boutique"
            className="shrink-0 cursor-pointer whitespace-nowrap rounded-pill border border-[var(--line)] px-3 py-2 text-xs font-semibold text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-ink-0"
          >
            ← Produits
          </Link>
        </div>

        {/* Fenêtre d'observation */}
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
          {AUDIENCE_WINDOWS.map((days) => (
            <button
              key={days}
              onClick={() => setWindow(days)}
              className={[
                'flex-1 cursor-pointer rounded-lg py-2.5 text-sm font-semibold transition-all',
                window === days ? 'bg-bg-0 text-ink-0 shadow-sm' : 'text-ink-3 hover:text-ink-1',
              ].join(' ')}
            >
              {days} jours
            </button>
          ))}
        </div>

        {!measuring && (
          <div className="rounded-xl border border-amber/25 bg-amber/5 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber">Mesure pas encore démarrée</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
              Aucune consultation enregistrée pour l’instant. Vérifie que la migration
              <span className="font-mono text-ink-1"> 036_product_stats.sql </span>
              est bien appliquée, puis ouvre une fiche produit depuis une session non connectée
              à l’admin (tes propres visites ne sont jamais comptées).
            </p>
          </div>
        )}

        {/* Vue d'ensemble */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label={`Vues · ${window} j`} value={nf.format(total.views)} accent="var(--amber)"
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4S1.5 8 1.5 8z" /><circle cx="8" cy="8" r="1.8" /></svg>} />
          <StatCard label="Visiteurs" value={nf.format(total.uniques)} accent="#38bdf8"
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="5.5" r="2.5" /><path d="M2.5 13.5a5.5 5.5 0 0111 0" /></svg>} />
          <StatCard label="Ajouts panier" value={nf.format(total.carts)} accent="var(--ink-1)"
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M1.5 1.5h1.8l1.5 8.2h7l1.4-6H4" /><circle cx="6.2" cy="13" r="1" /><circle cx="11.5" cy="13" r="1" /></svg>} />
          <StatCard label={`Conversion · ${totalOrders} vente${totalOrders > 1 ? 's' : ''}`} value={formatPct(conversion)} accent="#34d399"
            icon={<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2 11.5l3.5-3.5 2.5 2.5L14 4.5" /><path d="M10.5 4.5H14V8" /></svg>} />
        </div>

        {/* Courbe globale */}
        <DailyChart series={series} />

        {/* Tri */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Trier par</span>
          {SORTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={[
                'cursor-pointer rounded-pill border px-3 py-1 text-[12px] font-medium transition-colors',
                sort === key
                  ? 'border-[var(--line-amber)] bg-amber/10 text-amber'
                  : 'border-[var(--line)] text-ink-3 hover:text-ink-1',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Détail par produit */}
        <div className="space-y-2">
          {products.length === 0 && (
            <p className="rounded-xl border border-dashed border-[var(--line)] py-12 text-center text-sm text-ink-3">
              Aucun produit au catalogue.
            </p>
          )}
          {rows.map(({ product, s }) => (
            <ProductRow key={product.id} product={product} s={s} window={window} />
          ))}
        </div>

        {/* Méthode — évite d'avoir à se rappeler ce que compte chaque colonne */}
        <div className="rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3 text-[12px] leading-relaxed text-ink-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-2">Comment c’est compté</p>
          <p>
            <span className="text-ink-1">Vues</span> = chargements de la fiche ·{' '}
            <span className="text-ink-1">Visiteurs</span> = personnes distinctes par jour ·{' '}
            <span className="text-ink-1">Paniers</span> = ajouts au panier et « acheter maintenant » depuis la fiche ·{' '}
            <span className="text-ink-1">Conversion</span> = commandes payées ÷ visiteurs.
          </p>
          <p className="mt-1.5">
            Les robots et tes visites depuis l’admin sont exclus. Aucun cookie ni traceur :
            un visiteur est réduit à une empreinte anonyme qui change chaque nuit, effacée sous 45 jours.
            Les statistiques quotidiennes sont conservées 13 mois (durée recommandée par la CNIL).
          </p>
        </div>

      </div>
    </main>
  )
}

// ── Ligne produit ────────────────────────────────────────────────────────────

function ProductRow({ product, s, window }: { product: AudienceProduct; s: ProductStats; window: AudienceWindow }) {
  const price = product.sale_price ?? product.price
  const silent = s.views === 0

  return (
    <div className={[
      'rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3 transition-colors hover:border-[var(--line-2)]',
      silent ? 'opacity-60' : '',
    ].join(' ')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">

        {/* Identité */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--line)] bg-bg-2">
            {product.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.images[0]} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ink-3">
                <rect x="3" y="3" width="18" height="18" rx="3" /><path d="m3 9 4-4 4 4 4-4 4 4" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link href={`/admin/boutique/${product.id}`} className="truncate font-semibold text-ink-0 hover:text-amber transition-colors">
                {product.name}
              </Link>
              {!product.active && (
                <span className="shrink-0 rounded-pill border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-[10px] text-zinc-400">Inactif</span>
              )}
              {product.product_type === 'digital' && (
                <span className="shrink-0 rounded-pill border border-cyan-400/25 bg-cyan-400/5 px-2 py-0.5 font-mono text-[10px] text-cyan-400">fichier</span>
              )}
            </div>
            <p className="truncate text-[12px] text-ink-3">
              /boutique/{product.slug} · {formatPrice(price)}
              {s.lifetimeViews > s.views && <> · {nf.format(s.lifetimeViews)} vues au total</>}
            </p>
          </div>
        </div>

        {/* Tendance des vues sur la fenêtre */}
        <div className="hidden w-20 shrink-0 lg:block">
          <Spark values={s.spark} />
        </div>

        {/* Entonnoir */}
        <div className="grid shrink-0 grid-cols-5 gap-2 sm:flex sm:items-start sm:justify-end sm:gap-4">
          <Metric label="vues" value={nf.format(s.views)} trend={s.trend} window={window} />
          <Metric label="visiteurs" value={nf.format(s.uniques)} />
          <Metric label="paniers" value={nf.format(s.carts)} hint={s.cartRate !== null ? `${formatPct(s.cartRate, 0)} des visiteurs` : undefined} />
          <Metric label="ventes" value={nf.format(s.orders)} hint={s.revenue > 0 ? formatPrice(s.revenue) : undefined} />
          <Metric
            label="conv."
            value={formatPct(s.conversion)}
            color={s.conversion === null ? undefined : s.conversion >= 0.02 ? '#34d399' : s.conversion > 0 ? 'var(--amber)' : '#f87171'}
            hint={s.uniques > 0 && s.orders === 0 ? 'aucune vente' : undefined}
          />
        </div>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  hint,
  color,
  trend,
  window,
}: {
  label: string
  value: string
  hint?: string
  color?: string
  trend?: number | null
  window?: AudienceWindow
}) {
  const content = (
    <div className="text-right sm:w-[62px]">
      <p className="font-mono text-[14px] font-bold leading-tight tabular-nums" style={{ color: color ?? 'var(--ink-0)' }}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] uppercase tracking-wider text-ink-3">{label}</p>
      {trend !== undefined && trend !== null && (
        <p className={['mt-0.5 font-mono text-[10px] tabular-nums', trend >= 0 ? 'text-emerald-400' : 'text-red-400'].join(' ')}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(Math.round(trend * 100))} %
        </p>
      )}
    </div>
  )

  const tip = trend !== undefined && trend !== null && window
    ? `vs les ${window} jours précédents`
    : hint

  return tip ? <Tooltip content={tip}>{content}</Tooltip> : content
}

// ── Graphiques ───────────────────────────────────────────────────────────────

/** Vues par jour, tous produits confondus. */
function DailyChart({ series }: { series: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...series.map((p) => p.views))
  const point = hover !== null ? series[hover] : null

  return (
    <div className="rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-ink-3">Vues par jour</p>
        <p className="truncate font-mono text-[12px] text-ink-2">
          {point ? (
            <>
              {formatDay(point.day)} · <span className="text-amber">{nf.format(point.views)} vues</span>
              {' · '}{nf.format(point.uniques)} visiteurs
            </>
          ) : (
            <span className="hidden text-ink-3 sm:inline">Survole une barre pour le détail</span>
          )}
        </p>
      </div>

      <div className="flex h-28 items-end gap-[2px] border-b border-[var(--line)]">
        {series.map((p, i) => (
          <button
            key={p.day}
            type="button"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onBlur={() => setHover(null)}
            aria-label={`${formatDay(p.day)} : ${p.views} vues`}
            className="group relative h-full flex-1 cursor-pointer"
          >
            <span
              className="absolute bottom-0 w-full rounded-t-[2px] transition-colors"
              style={{
                height: `${Math.max((p.views / max) * 100, p.views > 0 ? 4 : 1.5)}%`,
                background: hover === i ? 'var(--amber)' : p.views > 0 ? 'color-mix(in srgb, var(--amber) 45%, transparent)' : 'var(--line-2)',
              }}
            />
          </button>
        ))}
      </div>

      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-ink-3">
        <span>{series.length > 0 && formatDay(series[0].day)}</span>
        <span>{series.length > 0 && formatDay(series[series.length - 1].day)}</span>
      </div>
    </div>
  )
}

/** Courbe miniature des vues d'un produit. */
function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values)
  const step = 100 / Math.max(1, values.length - 1)
  const points = values.map((v, i) => `${(i * step).toFixed(2)},${(26 - (v / max) * 24).toFixed(2)}`)

  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full" aria-hidden>
      <polygon
        points={`0,28 ${points.join(' ')} 100,28`}
        fill="color-mix(in srgb, var(--amber) 14%, transparent)"
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="var(--amber)"
        strokeWidth="1.25"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
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
