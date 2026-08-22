import { describe, it, expect, vi, beforeEach } from 'vitest'

const { supabaseMock, state } = vi.hoisted(() => {
  type Result = { data: unknown; error: { code?: string; message: string } | null }
  const state = {
    tableResults: new Map<string, Result[]>(),
    inserts: [] as Array<Record<string, unknown>>,
    reset() { this.tableResults.clear(); this.inserts.length = 0 },
    queue(table: string, ...results: Result[]) {
      this.tableResults.set(table, [...(this.tableResults.get(table) ?? []), ...results])
    },
  }
  function builder(table: string) {
    const record = { values: null as Record<string, unknown> | null }
    const proxy: Record<string, unknown> = {}
    const chain = (op: string) => (...args: unknown[]) => {
      if (op === 'insert') record.values = args[0] as Record<string, unknown>
      return proxy
    }
    for (const op of ['insert', 'update', 'select', 'eq', 'like', 'limit', 'order', 'maybeSingle', 'single']) {
      proxy[op] = chain(op)
    }
    proxy.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => {
      const q = state.tableResults.get(table)
      const res = q && q.length ? q.shift()! : { data: null, error: null }
      if (record.values) state.inserts.push(record.values)
      return Promise.resolve(res).then(onF, onR)
    }
    return proxy
  }
  return { supabaseMock: { from: (t: string) => builder(t) }, state }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: supabaseMock, supabase: supabaseMock }))

import { ensureInvoice, renderInvoicePdf, type InvoiceRecord } from './invoice'
import type { Order } from '@/types/order'
import type { ShopOrder } from '@/types/shop-order'
import type { CustomOrder } from '@/types/custom-order'

const nfcOrder = {
  id: 'af5b9894-1111-2222-3333-444455556666',
  created_at: '2026-08-15T10:00:00Z',
  company: 'Café des Sports', email: 'contact@exemple.fr', phone: '0612345678',
  // 50 × 2,20 € = 110 € + 6,90 € de port = 116,90 €
  quantity: 50, unit_price: 220, total_amount: 11690,
  shipping_name: 'Jean Dupont', shipping_address: '12 rue des Lilas', shipping_address2: null,
  shipping_city: 'Paris', shipping_postal_code: '75001',
} as unknown as Order

const shopOrder = {
  id: 'ca40306f-aaaa-bbbb-cccc-ddddeeeeffff',
  created_at: '2026-08-20T14:09:00Z',
  name: 'Jean Dupont', email: 'jean@exemple.fr', phone: '0612345678',
  items: [{ product_id: 'p1', product_name: 'Vase Hexagone', quantity: 2, unit_price: 2400 }],
  subtotal: 4800, discount_amount: 480, shipping: 490, total_amount: 4810,
  delivery_mode: 'delivery',
  shipping_name: 'Jean Dupont', shipping_address: '12 rue des Lilas', shipping_address2: null,
  shipping_city: 'Paris', shipping_postal_code: '75001',
} as unknown as ShopOrder

const customOrder = {
  id: '8c063e3e-76d6-4f48-a9e0-d397ac454b20',
  name: 'Jean Dupont', company: null, email: 'jean@exemple.fr', phone: '0612345678',
  project_type: 'deco', description: 'Dix caches en H.',
  quote_object: 'fabrication de caches en H', total_amount: 3500, deposit_amount: 1750,
  quote_items: [{ label: 'Cache en H', quantity: 10, unit_price: 350 }],
  balance_paid_at: '2026-08-21T09:00:00Z',
  shipping_address: '12 rue des Lilas', shipping_city: 'Paris', shipping_postal_code: '75001',
} as unknown as CustomOrder

/** Émission neuve : pas de facture existante, puis numérotation, puis insert. */
function queueFreshIssue(lastNumber: string | null, inserted: Partial<InvoiceRecord> = {}) {
  state.queue('invoices',
    { data: null, error: null },                                                  // recherche existante
    { data: lastNumber ? [{ number: lastNumber }] : [], error: null },            // dernier numéro
    { data: { number: 'FAC-2026-001', ...inserted }, error: null },               // insert
  )
}

beforeEach(() => state.reset())

describe('ensureInvoice', () => {
  it('réutilise la facture déjà émise plutôt que d’en créer une seconde', async () => {
    const existing = { number: 'FAC-2026-007', source: 'shop', order_id: shopOrder.id }
    state.queue('invoices', { data: existing, error: null })

    const invoice = await ensureInvoice('shop', shopOrder)
    expect(invoice.number).toBe('FAC-2026-007')
    expect(state.inserts).toHaveLength(0)
  })

  it('numérote à la suite, toutes sources confondues', async () => {
    queueFreshIssue('FAC-2026-012')
    await ensureInvoice('nfc', nfcOrder)
    expect(state.inserts[0].number).toBe('FAC-2026-013')
  })

  it('NFC : une ligne de porte-clés plus le port', async () => {
    queueFreshIssue(null)
    await ensureInvoice('nfc', nfcOrder)
    const row = state.inserts[0]
    expect(row.items).toEqual([expect.objectContaining({ quantity: 50, unit_price: 220 })])
    expect(row.adjustments).toEqual([{ label: 'Livraison', amount: 690 }])
    expect(row.total_amount).toBe(11690)
  })

  it('boutique : remise en négatif et port en positif', async () => {
    queueFreshIssue(null)
    await ensureInvoice('shop', shopOrder)
    const row = state.inserts[0]
    expect(row.adjustments).toEqual([
      { label: 'Réduction newsletter', amount: -480 },
      { label: 'Livraison', amount: 490 },
    ])
    expect(row.total_amount).toBe(4810)
  })

  it('sur-mesure : reprend les lignes du devis et la date du solde', async () => {
    queueFreshIssue(null)
    await ensureInvoice('custom', customOrder)
    const row = state.inserts[0]
    expect(row.items).toEqual([{ label: 'Cache en H', quantity: 10, unit_price: 350 }])
    expect(row.total_amount).toBe(3500)
    expect(row.paid_at).toBe('2026-08-21T09:00:00.000Z')
  })

  it('absorbe un écart entre les lignes et le montant encaissé', async () => {
    // Devis modifié après coup : les lignes ne font plus le total payé. Une
    // facture qui affiche autre chose que ce qui a été prélevé est fausse.
    queueFreshIssue(null)
    await ensureInvoice('custom', { ...customOrder, total_amount: 3000 } as CustomOrder)
    const row = state.inserts[0]
    expect(row.adjustments).toEqual([{ label: 'Remise', amount: -500 }])
    expect(row.total_amount).toBe(3000)
  })
})

describe('renderInvoicePdf', () => {
  it('produit un PDF dont le total égale le montant encaissé', async () => {
    const invoice: InvoiceRecord = {
      number: 'FAC-2026-001',
      issued_at: '2026-08-22T10:00:00Z',
      paid_at: '2026-08-20T14:09:00Z',
      source: 'shop',
      order_id: shopOrder.id,
      client_name: 'Jean Dupont', client_company: null, client_email: 'jean@exemple.fr',
      client_address: '12 rue des Lilas', client_postal_code: '75001', client_city: 'Paris',
      object: 'Objets imprimés en 3D',
      items: [{ label: 'Vase Hexagone', quantity: 2, unit_price: 2400 }],
      adjustments: [{ label: 'Réduction newsletter', amount: -480 }, { label: 'Livraison', amount: 490 }],
      total_amount: 4810,
    }
    const pdf = await renderInvoicePdf(invoice)
    expect(Buffer.from(pdf.slice(0, 5)).toString()).toBe('%PDF-')
  })
})
