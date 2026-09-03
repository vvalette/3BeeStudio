import { describe, it, expect, vi, beforeEach } from 'vitest'

// Même mock Supabase chainable que les autres routes sur-mesure.
const { supabaseMock, state } = vi.hoisted(() => {
  type Result = { data: unknown; error: { code?: string; message: string } | null }
  const state = {
    tableResults: new Map<string, Result[]>(),
    writes: [] as Array<{ table: string; op: string; values: Record<string, unknown> }>,
    reset() {
      this.tableResults.clear()
      this.writes.length = 0
    },
    queue(table: string, ...results: Result[]) {
      this.tableResults.set(table, [...(this.tableResults.get(table) ?? []), ...results])
    },
  }

  function builder(table: string) {
    const record = { op: '', values: {} as Record<string, unknown> }
    const proxy: Record<string, unknown> = {}
    const chain =
      (op: string) =>
      (...args: unknown[]) => {
        if (op === 'update' || op === 'insert') {
          record.op = op
          record.values = args[0] as Record<string, unknown>
        }
        return proxy
      }
    for (const op of ['update', 'insert', 'delete', 'select', 'eq', 'single', 'maybeSingle']) {
      proxy[op] = chain(op)
    }
    proxy.then = (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => {
      const q = state.tableResults.get(table)
      const res = q && q.length ? q.shift()! : { data: null, error: null }
      if (record.op) state.writes.push({ table, op: record.op, values: record.values })
      return Promise.resolve(res).then(onF, onR)
    }
    return proxy
  }

  return { supabaseMock: { from: (t: string) => builder(t) }, state }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: supabaseMock, supabase: supabaseMock }))
vi.mock('@/lib/auth', () => ({ isAuthenticated: vi.fn(async () => true) }))

import { PATCH } from './route'
import { isAuthenticated } from '@/lib/auth'
import type { NextRequest } from 'next/server'

const params = Promise.resolve({ orderId: '8c063e3e-76d6-4f48-a9e0-d397ac454b20' })

function request(body: unknown) {
  return new Request('http://localhost/api/admin/custom/x', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

beforeEach(() => {
  state.reset()
  vi.mocked(isAuthenticated).mockResolvedValue(true)
})

describe('PATCH /api/admin/custom/[orderId]', () => {
  it('refuse un appel non authentifié', async () => {
    vi.mocked(isAuthenticated).mockResolvedValue(false)
    expect((await PATCH(request({ status: 'shipped' }), { params })).status).toBe(401)
  })

  it('enregistre les montants du devis sans le marquer envoyé', async () => {
    state.queue('custom_orders', { data: { id: 'x' }, error: null })

    const res = await PATCH(request({
      total_amount: 35000, deposit_amount: 17500,
      quote_object: 'dix caches en H', quote_number: '2026-014',
    }), { params })
    expect(res.status).toBe(200)

    const write = state.writes.at(-1)!.values
    expect(write.total_amount).toBe(35000)
    expect(write.quote_number).toBe('2026-014')
    // Rien n'est parti au client : ni statut `quote_sent`, ni date d'émission.
    expect(write).not.toHaveProperty('status')
    expect(write).not.toHaveProperty('quote_issued_at')
  })

  it('signale un numéro de devis déjà pris', async () => {
    state.queue('custom_orders', {
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "custom_orders_quote_number_key"' },
    })

    const res = await PATCH(request({ quote_number: '2026-014' }), { params })
    expect(res.status).toBe(409)
    expect((await res.json() as { error: string }).error).toContain('2026-014')
  })
})
