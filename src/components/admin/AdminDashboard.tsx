import Link from 'next/link'
import type { Route } from 'next'
import type { Order } from '@/types/order'
import type { CustomOrder } from '@/types/custom-order'
import type { ShopOrder } from '@/types/shop-order'
import type { ShopProduct } from '@/types/shop-product'
import { formatPrice } from '@/lib/utils'
import { LOW_STOCK_THRESHOLD, isLowStock } from '@/lib/stock'

/**
 * Écran d'accueil de l'admin : « qu'est-ce que je dois faire maintenant ».
 *
 * `/admin` se contentait de rediriger vers la liste des commandes, où il fallait
 * ensuite reconstituer soi-même le travail en attente en croisant trois onglets et
 * leurs filtres. Ici chaque bloc est une action concrète, et disparaît quand il
 * n'y a rien à faire — une page vide veut dire « rien en attente », ce qui est
 * l'information la plus utile du lot.
 */

interface TaskGroup {
  key: string
  label: string
  count: number
  accent: string
  href: Route
  hint: string
  items: { id: string; label: string; href: Route; meta?: string }[]
}

export default function AdminDashboard({
  orders,
  customOrders,
  shopOrders,
  products,
  monthRevenue,
}: {
  /** Commandes hors statuts terminaux — ce composant ne liste que du travail en attente. */
  orders: Order[]
  customOrders: CustomOrder[]
  shopOrders: ShopOrder[]
  products: ShopProduct[]
  /** Calculé côté serveur sur toutes les commandes du mois, livrées comprises. */
  monthRevenue: number
}) {
  const ref = (id: string) => `#${id.slice(0, 8).toUpperCase()}`

  // Devis sur-mesure en attente : le client a demandé, personne n'a répondu.
  const quotesToSend = customOrders.filter((o) => o.status === 'pending_quote')

  // À préparer : payé, production pas encore lancée. Une commande 100 % fichiers
  // n'a rien à produire — elle est livrée dès le paiement, la faire figurer ici
  // serait une tâche fantôme qui ne disparaîtrait jamais.
  const shopToPrepare = shopOrders.filter((o) => o.status === 'confirmed' && o.has_physical)
  const nfcToPrepare  = orders.filter((o) => o.status === 'confirmed')

  // Étiquettes à générer : en préparation, sans expédition Boxtal rattachée.
  // Retrait studio et vente de fichiers exclus — il n'y a pas de colis à expédier.
  const shopLabels = shopOrders.filter(
    (o) => o.status === 'processing' && !o.boxtal_order_id
      && o.delivery_mode !== 'pickup' && o.delivery_mode !== 'digital',
  )
  const nfcLabels = orders.filter((o) => o.status === 'processing' && !o.boxtal_order_id)

  // Retraits studio à organiser : il faut appeler le client pour un créneau.
  const pickups = shopOrders.filter(
    (o) => o.delivery_mode === 'pickup' && (o.status === 'confirmed' || o.status === 'processing'),
  )

  const lowStock = products.filter((p) => p.active && isLowStock(p.stock))

  const groups: TaskGroup[] = [
    {
      key: 'quotes',
      label: 'Devis à envoyer',
      count: quotesToSend.length,
      accent: '#c084fc',
      href: '/admin/sur-mesure' as Route,
      hint: 'Le client attend une réponse — aucun devis n’a encore été émis.',
      items: quotesToSend.map((o) => ({
        id: o.id,
        label: o.company || o.name, // `||` : company vaut '' pour un particulier, pas null
        href: `/admin/custom/${o.id}` as Route,
        meta: o.project_type,
      })),
    },
    {
      key: 'prepare',
      label: 'À mettre en production',
      count: shopToPrepare.length + nfcToPrepare.length,
      accent: '#F59E0B',
      href: '/admin/commandes' as Route,
      hint: 'Payées, production pas encore lancée.',
      items: [
        ...shopToPrepare.map((o) => ({
          id: o.id,
          label: o.name,
          href: `/admin/boutique/commande/${o.id}` as Route,
          meta: `Boutique · ${o.items.reduce((s, i) => s + i.quantity, 0)} article(s)`,
        })),
        ...nfcToPrepare.map((o) => ({
          id: o.id,
          label: o.company,
          href: `/admin/commandes/${o.id}` as Route,
          meta: `NFC · ${o.quantity} pcs`,
        })),
      ],
    },
    {
      key: 'labels',
      label: 'Étiquettes à générer',
      count: shopLabels.length + nfcLabels.length,
      accent: '#a3e635',
      href: '/admin/commandes' as Route,
      hint: 'En préparation, sans expédition Boxtal rattachée.',
      items: [
        ...shopLabels.map((o) => ({
          id: o.id,
          label: o.name,
          href: `/admin/boutique/commande/${o.id}` as Route,
          meta: `Boutique · ${o.shipping_city ?? ''}`,
        })),
        ...nfcLabels.map((o) => ({
          id: o.id,
          label: o.company,
          href: `/admin/commandes/${o.id}` as Route,
          meta: `NFC · ${o.shipping_city ?? ''}`,
        })),
      ],
    },
    {
      key: 'pickups',
      label: 'Retraits studio à caler',
      count: pickups.length,
      accent: '#38bdf8',
      href: '/admin/commandes' as Route,
      hint: 'Contacter le client pour convenir d’un créneau.',
      items: pickups.map((o) => ({
        id: o.id,
        label: o.name,
        href: `/admin/boutique/commande/${o.id}` as Route,
        meta: o.phone ?? o.email,
      })),
    },
    {
      key: 'stock',
      label: 'Stocks à réimprimer',
      count: lowStock.length,
      accent: '#fb923c',
      href: '/admin/boutique' as Route,
      hint: `Produits actifs à ${LOW_STOCK_THRESHOLD} unités ou moins.`,
      items: lowStock.map((p) => ({
        id: p.id,
        label: p.name,
        href: `/admin/boutique/${p.id}` as Route,
        meta: p.stock === 0 ? 'En rupture' : `${p.stock} restant${(p.stock ?? 0) > 1 ? 's' : ''}`,
      })),
    },
  ].filter((g) => g.count > 0)

  const totalTasks = groups.reduce((s, g) => s + g.count, 0)

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-12">
      <div className="mx-auto max-w-3xl space-y-5">

        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">3BeeStudio · Admin</p>
          <h1 className="mt-1.5 text-xl font-extrabold text-ink-0 sm:text-2xl" style={{ letterSpacing: '-0.02em' }}>
            {totalTasks === 0 ? 'Rien en attente 🐝' : `${totalTasks} chose${totalTasks > 1 ? 's' : ''} à faire`}
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}
            <span className="font-mono text-amber">{formatPrice(monthRevenue)}</span> ce mois-ci
          </p>
        </div>

        {groups.length === 0 && (
          <div className="rounded-2xl border border-[var(--line)] bg-bg-1 px-5 py-10 text-center">
            <p className="text-sm text-ink-1">Aucune commande en attente d&apos;action.</p>
            <p className="mt-1.5 text-[13px] text-ink-3">
              Tous les devis sont partis, les étiquettes générées, les stocks au-dessus du seuil.
            </p>
            <Link href="/admin/commandes" className="mt-4 inline-block text-sm text-amber hover:underline">
              Voir toutes les commandes →
            </Link>
          </div>
        )}

        {groups.map((g) => (
          <section key={g.key} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-1">
            <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-pill px-1.5 font-mono text-[12px] font-bold"
                  style={{ background: `color-mix(in srgb, ${g.accent} 15%, transparent)`, color: g.accent }}
                >
                  {g.count}
                </span>
                <h2 className="truncate text-sm font-semibold text-ink-0">{g.label}</h2>
              </div>
              <Link href={g.href} className="shrink-0 whitespace-nowrap text-[11px] text-ink-3 transition-colors hover:text-amber">
                Tout voir →
              </Link>
            </header>

            <p className="px-4 pt-3 text-[11px] text-ink-3 sm:px-5">{g.hint}</p>

            <ul className="divide-y divide-[var(--line)] px-4 pb-1 pt-2 sm:px-5">
              {g.items.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="flex items-center gap-3 py-2.5 transition-colors hover:text-amber">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-1">{item.label}</span>
                    {item.meta && <span className="shrink-0 truncate text-[11px] text-ink-3">{item.meta}</span>}
                    <span className="shrink-0 font-mono text-[10px] text-ink-3">{ref(item.id)}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {g.items.length > 5 && (
              <p className="px-4 pb-3 text-[11px] text-ink-3 sm:px-5">+ {g.items.length - 5} autre(s)</p>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
