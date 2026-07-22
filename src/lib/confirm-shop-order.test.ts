import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase chainable : les résultats sont empilés par table (FIFO), et chaque
// update/delete est enregistré pour vérifier filtres et valeurs.
const { supabaseMock, state } = vi.hoisted(() => {
  type Result = { data: unknown; error: { message: string } | null }
  const state = {
    tableResults: new Map<string, Result[]>(),
    rpcResults: [] as Result[],
    writes: [] as Array<{ table: string; op: string; values: unknown; filters: Array<[string, unknown]> }>,
    rpcCalls: [] as Array<{ fn: string; args: unknown }>,
    reset() {
      this.tableResults.clear()
      this.rpcResults.length = 0
      this.writes.length = 0
      this.rpcCalls.length = 0
    },
    queue(table: string, ...results: Result[]) {
      this.tableResults.set(table, [...(this.tableResults.get(table) ?? []), ...results])
    },
  }

  function builder(table: string) {
    const record = { op: '', values: undefined as unknown, filters: [] as Array<[string, unknown]> }
    const proxy: Record<string, unknown> = {}
    const chain =
      (op: string) =>
      (...args: unknown[]) => {
        if (op === 'update' || op === 'insert' || op === 'delete') {
          record.op = op
          record.values = args[0]
        }
        if (op === 'eq') record.filters.push([args[0] as string, args[1]])
        return proxy
      }
    for (const op of ['update', 'insert', 'delete', 'select', 'eq', 'in', 'maybeSingle', 'single', 'order']) {
      proxy[op] = chain(op)
    }
    proxy.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => {
      const q = state.tableResults.get(table)
      const res = q && q.length ? q.shift()! : { data: null, error: null }
      if (record.op) state.writes.push({ table, op: record.op, values: record.values, filters: record.filters })
      return Promise.resolve(res).then(onF, onR)
    }
    return proxy
  }

  const supabaseMock = {
    from: (table: string) => builder(table),
    rpc: (fn: string, args: unknown) => {
      state.rpcCalls.push({ fn, args })
      const res = state.rpcResults.length ? state.rpcResults.shift()! : { data: null, error: null }
      return Promise.resolve(res)
    },
  }
  return { supabaseMock, state }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: supabaseMock, supabase: supabaseMock }))
vi.mock('@/lib/resend', () => ({ sendShopOrderConfirmation: vi.fn(async () => {}) }))
vi.mock('@/lib/alert', () => ({ sendCriticalAlert: vi.fn(async () => {}) }))
vi.mock('@/lib/revalidate', () => ({ revalidateShop: vi.fn() }))

import { confirmShopOrder } from './confirm-shop-order'
import { sendShopOrderConfirmation } from '@/lib/resend'
import { sendCriticalAlert } from '@/lib/alert'
import { revalidateShop } from '@/lib/revalidate'

const orderRow = {
  id: 'so_1',
  status: 'confirmed',
  email: 'client@exemple.fr',
  locale: 'fr',
  items: [
    { product_id: 'p1', product_name: 'Vase Hex', quantity: 2, unit_price: 1500 },
  ],
}

beforeEach(() => {
  state.reset()
  vi.clearAllMocks()
})

describe('confirmShopOrder', () => {
  it('confirme, décrémente le stock, revalide et envoie l’email', async () => {
    state.queue('shop_orders', { data: orderRow, error: null })
    state.rpcResults.push({ data: [{ new_stock: 3, oversold: false }], error: null })
    state.queue('shop_products', { data: [{ slug: 'vase-hex' }], error: null })

    const result = await confirmShopOrder('so_1')

    expect(result.order).toMatchObject({ id: 'so_1' })
    expect(result.error).toBeUndefined()
    expect(state.writes[0]).toMatchObject({
      table: 'shop_orders',
      op: 'update',
      values: { status: 'confirmed' },
      filters: [['id', 'so_1'], ['status', 'pending_payment']],
    })
    expect(state.rpcCalls).toEqual([
      { fn: 'decrement_shop_stock', args: { p_product_id: 'p1', p_qty: 2 } },
    ])
    expect(revalidateShop).toHaveBeenCalledWith('vase-hex')
    expect(sendShopOrderConfirmation).toHaveBeenCalledOnce()
    expect(sendCriticalAlert).not.toHaveBeenCalled()
  })

  it('rejeu idempotent : 0 ligne mise à jour → aucun effet de bord', async () => {
    state.queue('shop_orders', { data: null, error: null })

    const result = await confirmShopOrder('so_1')

    expect(result).toEqual({})
    expect(state.rpcCalls).toHaveLength(0)
    expect(sendShopOrderConfirmation).not.toHaveBeenCalled()
    expect(sendCriticalAlert).not.toHaveBeenCalled()
  })

  it('échec DB → { error: true } + alerte critique', async () => {
    state.queue('shop_orders', { data: null, error: { message: 'connexion perdue' } })

    const result = await confirmShopOrder('so_1')

    expect(result.error).toBe(true)
    expect(sendCriticalAlert).toHaveBeenCalledWith(
      expect.stringContaining('échec confirmation commande boutique'),
      expect.objectContaining({ shopOrderId: 'so_1', erreur: 'connexion perdue' }),
    )
    expect(sendShopOrderConfirmation).not.toHaveBeenCalled()
  })

  it('survente détectée par la RPC → alerte, mais la commande reste confirmée', async () => {
    state.queue('shop_orders', { data: orderRow, error: null })
    state.rpcResults.push({ data: [{ new_stock: 0, oversold: true }], error: null })
    state.queue('shop_products', { data: [{ slug: 'vase-hex' }], error: null })

    const result = await confirmShopOrder('so_1')

    expect(result.order).toBeDefined()
    expect(sendCriticalAlert).toHaveBeenCalledWith(
      expect.stringContaining('Survente'),
      expect.objectContaining({ productId: 'p1', quantiteCommandee: 2, stockRestant: 0 }),
    )
    expect(sendShopOrderConfirmation).toHaveBeenCalledOnce()
  })

  it('RPC legacy (void, avant migration 028) → pas de crash, pas d’alerte', async () => {
    state.queue('shop_orders', { data: orderRow, error: null })
    state.rpcResults.push({ data: null, error: null })
    state.queue('shop_products', { data: [{ slug: 'vase-hex' }], error: null })

    const result = await confirmShopOrder('so_1')

    expect(result.order).toBeDefined()
    expect(sendCriticalAlert).not.toHaveBeenCalled()
  })

  it('erreur RPC stock → loggée mais non bloquante (email quand même envoyé)', async () => {
    state.queue('shop_orders', { data: orderRow, error: null })
    state.rpcResults.push({ data: null, error: { message: 'function missing' } })
    state.queue('shop_products', { data: [{ slug: 'vase-hex' }], error: null })

    const result = await confirmShopOrder('so_1')

    expect(result.order).toBeDefined()
    expect(sendShopOrderConfirmation).toHaveBeenCalledOnce()
  })
})
