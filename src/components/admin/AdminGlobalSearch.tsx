'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import type { Order } from '@/types/order'
import type { CustomOrder } from '@/types/custom-order'
import type { ShopOrder } from '@/types/shop-order'
import { ORDER_STATUS_LABELS } from '@/types/order'
import { CUSTOM_STATUS_LABELS } from '@/types/custom-order'
import { SHOP_STATUS_LABELS } from '@/types/shop-order'
import { STATUS_PILL, CUSTOM_STATUS_PILL, SHOP_STATUS_PILL } from '@/lib/status-ui'
import { formatPrice } from '@/lib/utils'

/**
 * Recherche transverse aux trois flux.
 *
 * La recherche des onglets est cloisonnée : quand un client écrit, on ne sait pas
 * a priori si sa commande est boutique, sur-mesure ou NFC — il fallait la chercher
 * dans les trois onglets l'un après l'autre. Ici une seule saisie, résultats
 * groupés par flux, lien direct vers la fiche.
 */

const MIN_QUERY = 2
const MAX_PER_FLOW = 5

interface Hit {
  id: string
  href: Route
  title: string
  subtitle: string
  amount: number
  statusLabel: string
  statusPill: string
  date: string
}

function matches(query: string, fields: (string | null | undefined)[]): boolean {
  return fields.some((f) => (f ?? '').toLowerCase().includes(query))
}

export default function AdminGlobalSearch({
  orders,
  customOrders,
  shopOrders,
}: {
  orders: Order[]
  customOrders: CustomOrder[]
  shopOrders: ShopOrder[]
}) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const active = q.length >= MIN_QUERY

  const groups = useMemo(() => {
    if (!active) return []

    const shop: Hit[] = shopOrders
      .filter((o) => matches(q, [o.name, o.email, o.id, o.shipping_city, o.tracking_number]))
      .map((o) => ({
        id: o.id,
        href: `/admin/boutique/commande/${o.id}` as Route,
        title: o.name,
        subtitle: o.email,
        amount: o.total_amount,
        statusLabel: SHOP_STATUS_LABELS[o.status],
        statusPill: SHOP_STATUS_PILL[o.status],
        date: o.created_at,
      }))

    const custom: Hit[] = customOrders
      .filter((o) => matches(q, [o.name, o.company, o.email, o.id]))
      .map((o) => ({
        id: o.id,
        href: `/admin/custom/${o.id}` as Route,
        title: o.company || o.name, // `||` et non `??` : company vaut souvent '' (particulier)
        subtitle: o.email,
        amount: o.deposit_amount ?? 0,
        statusLabel: CUSTOM_STATUS_LABELS[o.status],
        statusPill: CUSTOM_STATUS_PILL[o.status],
        date: o.created_at,
      }))

    const nfc: Hit[] = orders
      .filter((o) => matches(q, [o.company, o.email, o.id, o.tracking_number]))
      .map((o) => ({
        id: o.id,
        href: `/admin/commandes/${o.id}` as Route,
        title: o.company,
        subtitle: o.email,
        amount: o.total_amount,
        statusLabel: ORDER_STATUS_LABELS[o.status],
        statusPill: STATUS_PILL[o.status],
        date: o.created_at,
      }))

    return [
      { flow: 'Boutique',   accent: '#38bdf8', hits: shop },
      { flow: 'Sur-mesure', accent: '#c084fc', hits: custom },
      { flow: 'Porte-clé NFC', accent: '#a3e635', hits: nfc },
    ].filter((g) => g.hits.length > 0)
  }, [q, active, orders, customOrders, shopOrders])

  const total = groups.reduce((s, g) => s + g.hits.length, 0)

  return (
    <div className="relative">
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" />
          </svg>
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') setQuery('') }}
          placeholder="Rechercher dans tous les flux — nom, email, référence, ville, n° de suivi…"
          aria-label="Recherche globale des commandes"
          className="w-full rounded-xl border border-[var(--line)] bg-bg-1 py-2.5 pl-10 pr-10 text-sm text-ink-0 placeholder:text-ink-3 transition-colors focus:border-amber focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-ink-3 transition-colors hover:text-ink-0"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        )}
      </div>

      {active && (
        <div className="mt-2 overflow-hidden rounded-xl border border-[var(--line)] bg-bg-1">
          {total === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-3">
              Aucune commande ne correspond à « {query.trim()} ».
            </p>
          ) : (
            <>
              <p className="border-b border-[var(--line)] px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                {total} résultat{total > 1 ? 's' : ''} · tous flux
              </p>
              {groups.map((g) => (
                <div key={g.flow}>
                  <p className="flex items-center gap-2 bg-bg-2 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: g.accent }} />
                    {g.flow}
                    <span className="font-mono text-ink-3">{g.hits.length}</span>
                  </p>
                  {g.hits.slice(0, MAX_PER_FLOW).map((hit) => (
                    <Link
                      key={hit.id}
                      href={hit.href}
                      className="flex items-center gap-3 border-t border-[var(--line)] px-4 py-2.5 transition-colors hover:bg-bg-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-ink-0">{hit.title}</p>
                        <p className="truncate font-mono text-[11px] text-ink-3">
                          #{hit.id.slice(0, 8).toUpperCase()} · {hit.subtitle}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[12px] text-ink-2">{formatPrice(hit.amount)}</span>
                      <span className={['shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-medium', hit.statusPill].join(' ')}>
                        {hit.statusLabel}
                      </span>
                    </Link>
                  ))}
                  {g.hits.length > MAX_PER_FLOW && (
                    <p className="border-t border-[var(--line)] px-4 py-2 text-[11px] text-ink-3">
                      + {g.hits.length - MAX_PER_FLOW} autre{g.hits.length - MAX_PER_FLOW > 1 ? 's' : ''} — affinez la recherche
                    </p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
