import { describe, it, expect } from 'vitest'
import {
  shiftDay,
  parisDay,
  buildProductStats,
  buildDailySeries,
  countsAsSale,
  type DailyStat,
  type OrderForStats,
} from './product-stats'
import { isBotUserAgent, visitorHash } from './product-stats.server'

const TODAY = '2026-08-24'
const P1 = '11111111-1111-1111-1111-111111111111'
const P2 = '22222222-2222-2222-2222-222222222222'

function stat(product_id: string, day: string, views: number, uniques = views, carts = 0): DailyStat {
  return { product_id, day, views, uniques, carts }
}

describe('shiftDay', () => {
  it('avance et recule sans dériver au changement d’heure', () => {
    expect(shiftDay('2026-08-24', -1)).toBe('2026-08-23')
    expect(shiftDay('2026-08-24', 7)).toBe('2026-08-31')
    // Bascule heure d'été → heure d'hiver : le 25/10/2026 dure 25 h à Paris.
    expect(shiftDay('2026-10-26', -1)).toBe('2026-10-25')
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('parisDay', () => {
  // 23 h UTC en été = 1 h du matin à Paris, donc déjà le lendemain : compter en
  // UTC rangerait les vues du soir sur le mauvais jour.
  it('bascule à minuit à Paris, pas à minuit UTC', () => {
    expect(parisDay(new Date('2026-08-24T23:30:00Z'))).toBe('2026-08-25')
    expect(parisDay(new Date('2026-08-24T12:00:00Z'))).toBe('2026-08-24')
    expect(parisDay(new Date('2026-01-15T23:30:00Z'))).toBe('2026-01-16')
  })
})

describe('isBotUserAgent', () => {
  it('laisse passer un vrai navigateur', () => {
    expect(isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1')).toBe(false)
    expect(isBotUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 Safari/537.36')).toBe(false)
  })

  it('écarte robots, aperçus de lien et scripts', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true)
    expect(isBotUserAgent('facebookexternalhit/1.1')).toBe(true)
    expect(isBotUserAgent('WhatsApp/2.23')).toBe(true)
    expect(isBotUserAgent('curl/8.4.0')).toBe(true)
    expect(isBotUserAgent('HeadlessChrome/120.0.0.0')).toBe(true)
    expect(isBotUserAgent(null)).toBe(true)
    expect(isBotUserAgent('')).toBe(true)
  })
})

describe('visitorHash', () => {
  it('est stable sur la journée et change le lendemain', () => {
    const a = visitorHash('88.10.0.1', 'Mozilla/5.0', '2026-08-24')
    const b = visitorHash('88.10.0.1', 'Mozilla/5.0', '2026-08-24')
    const c = visitorHash('88.10.0.1', 'Mozilla/5.0', '2026-08-25')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('ne laisse pas fuiter l’IP', () => {
    const h = visitorHash('88.10.0.1', 'Mozilla/5.0', '2026-08-24')
    expect(h).not.toContain('88.10.0.1')
    expect(h).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('buildProductStats', () => {
  const daily: DailyStat[] = [
    stat(P1, TODAY, 10, 6, 2),
    stat(P1, shiftDay(TODAY, -3), 5, 4, 1),
    stat(P1, shiftDay(TODAY, -20), 7, 5),
    // Hors fenêtre 30 j, dans la fenêtre précédente → sert la tendance.
    stat(P1, shiftDay(TODAY, -40), 100, 80),
    stat(P2, shiftDay(TODAY, -1), 3, 3),
  ]

  const orders: OrderForStats[] = [
    {
      created_at: `${TODAY}T09:00:00Z`,
      status: 'confirmed',
      items: [
        { product_id: P1, product_name: 'A', quantity: 2, unit_price: 1500 },
        { product_id: P2, product_name: 'B', quantity: 1, unit_price: 900 },
      ],
    },
    // Jamais payée : ne compte pas comme conversion.
    {
      created_at: `${TODAY}T10:00:00Z`,
      status: 'pending_payment',
      items: [{ product_id: P1, product_name: 'A', quantity: 5, unit_price: 1500 }],
    },
    // Hors fenêtre.
    {
      created_at: `${shiftDay(TODAY, -45)}T10:00:00Z`,
      status: 'delivered',
      items: [{ product_id: P1, product_name: 'A', quantity: 3, unit_price: 1500 }],
    },
  ]

  const stats = buildProductStats({ daily, orders, days: 30, today: TODAY })

  it('additionne la fenêtre et ignore ce qui la précède', () => {
    const s = stats.get(P1)!
    expect(s.views).toBe(22)     // 10 + 5 + 7
    expect(s.uniques).toBe(15)   // 6 + 4 + 5
    expect(s.carts).toBe(3)
    expect(s.views7).toBe(15)    // seuls aujourd'hui et J-3
    expect(s.viewsPrev).toBe(100)
  })

  it('compte une commande payée par produit, pas par unité', () => {
    const s = stats.get(P1)!
    expect(s.orders).toBe(1)
    expect(s.units).toBe(2)
    expect(s.revenue).toBe(3000)
  })

  it('exclut les commandes non payées et hors fenêtre', () => {
    expect(countsAsSale('pending_payment')).toBe(false)
    expect(countsAsSale('cancelled')).toBe(false)
    expect(countsAsSale('shipped')).toBe(true)
    // 5 unités en attente de paiement + 3 hors fenêtre auraient triplé le total.
    expect(stats.get(P1)!.units).toBe(2)
  })

  it('calcule conversion, taux de panier et tendance', () => {
    const s = stats.get(P1)!
    expect(s.conversion).toBeCloseTo(1 / 15)
    expect(s.cartRate).toBeCloseTo(3 / 15)
    expect(s.trend).toBeCloseTo((22 - 100) / 100)
  })

  it('produit une sparkline alignée sur la fenêtre', () => {
    const s = stats.get(P1)!
    expect(s.spark).toHaveLength(30)
    expect(s.spark[29]).toBe(10)  // aujourd'hui, dernier point
    expect(s.spark[26]).toBe(5)   // J-3
    expect(s.spark[9]).toBe(7)    // J-20
  })

  it('laisse la conversion à null quand personne n’est venu', () => {
    const empty = buildProductStats({ daily: [], orders: [], days: 30, today: TODAY })
    expect(empty.size).toBe(0)
    const noVisitor = buildProductStats({ daily: [stat(P1, TODAY, 0, 0)], orders: [], days: 30, today: TODAY })
    expect(noVisitor.get(P1)!.conversion).toBeNull()
    expect(noVisitor.get(P1)!.trend).toBeNull()
  })
})

describe('buildDailySeries', () => {
  it('renvoie un point par jour, trous compris', () => {
    const series = buildDailySeries([stat(P1, TODAY, 4), stat(P2, TODAY, 6)], 7, TODAY)
    expect(series).toHaveLength(7)
    expect(series[0].day).toBe(shiftDay(TODAY, -6))
    expect(series[6].day).toBe(TODAY)
    expect(series[6].views).toBe(10)  // les produits sont cumulés
    expect(series[3].views).toBe(0)
  })
})
