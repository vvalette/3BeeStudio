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
    for (const op of ['update', 'insert', 'delete', 'select', 'eq', 'in', 'is', 'not', 'like', 'limit', 'maybeSingle', 'single', 'order']) {
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

import { POST } from './route'
import { isAuthenticated } from '@/lib/auth'
import type { NextRequest } from 'next/server'

const ORDER = {
  id: '8c063e3e-76d6-4f48-a9e0-d397ac454b20',
  name: 'Jean Dupont',
  email: 'jean@exemple.fr',
  status: 'quote_sent',
  deposit_amount: 17500, deposit_paid_at: null, deposit_method: null,
  total_amount: 35000,
  balance_amount: null, balance_paid_at: null, balance_method: null,
}

const params = Promise.resolve({ orderId: ORDER.id })

function request(body: unknown) {
  return new Request('http://localhost/api/admin/custom/x/payment', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

/** Dernière écriture envoyée à Supabase. */
function lastWrite() {
  return state.writes.at(-1)!.values
}

beforeEach(() => {
  state.reset()
  vi.mocked(isAuthenticated).mockResolvedValue(true)
})

describe('POST /api/admin/custom/[orderId]/payment', () => {
  it('refuse un appel non authentifié', async () => {
    vi.mocked(isAuthenticated).mockResolvedValue(false)
    const res = await POST(request({ kind: 'deposit' }), { params })
    expect(res.status).toBe(401)
  })

  it('déclare un acompte reçu par virement et fait avancer le statut', async () => {
    state.queue('custom_orders', { data: ORDER, error: null }, { data: ORDER, error: null })

    const res = await POST(request({
      kind: 'deposit', method: 'transfer', paid_at: '2026-08-20',
    }), { params })
    expect(res.status).toBe(200)

    const write = lastWrite()
    expect(write.status).toBe('deposit_paid')
    expect(write.deposit_method).toBe('transfer')
    // Montant repris du devis quand l'admin n'en saisit pas d'autre.
    expect(write.deposit_amount).toBe(17500)
    expect(String(write.deposit_paid_at)).toContain('2026-08-20')
  })

  it('ne fait pas reculer une demande déjà en production', async () => {
    state.queue('custom_orders',
      { data: { ...ORDER, status: 'in_production' }, error: null },
      { data: ORDER, error: null },
    )

    await POST(request({ kind: 'deposit', method: 'cash' }), { params })
    // Le statut n'est pas touché : la production est plus avancée que l'encaissement.
    expect(lastWrite()).not.toHaveProperty('status')
  })

  it('refuse une date d’encaissement dans le futur', async () => {
    state.queue('custom_orders', { data: ORDER, error: null })
    const future = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString()
    const res = await POST(request({ kind: 'deposit', paid_at: future }), { params })
    expect(res.status).toBe(422)
    expect(state.writes).toHaveLength(0)
  })

  it('refuse un acompte dont le montant est inconnu', async () => {
    state.queue('custom_orders', { data: { ...ORDER, deposit_amount: null }, error: null })
    const res = await POST(request({ kind: 'deposit' }), { params })
    expect(res.status).toBe(422)
    expect((await res.json() as { error: string }).error).toContain('Montant')
  })

  it('annule un encaissement déclaré par erreur', async () => {
    state.queue('custom_orders',
      { data: { ...ORDER, status: 'deposit_paid', deposit_paid_at: '2026-08-20T10:00:00Z', deposit_method: 'transfer' }, error: null },
      { data: ORDER, error: null },
    )

    const res = await POST(request({ kind: 'deposit', received: false }), { params })
    expect(res.status).toBe(200)

    const write = lastWrite()
    expect(write.deposit_paid_at).toBeNull()
    expect(write.deposit_method).toBeNull()
    expect(write.status).toBe('quote_sent')
  })

  it('déduit le solde du total et de l’acompte', async () => {
    state.queue('custom_orders',
      { data: { ...ORDER, status: 'in_production', deposit_paid_at: '2026-08-20T10:00:00Z' }, error: null },
      { data: ORDER, error: null },
    )

    const res = await POST(request({ kind: 'balance', method: 'check' }), { params })
    expect(res.status).toBe(200)

    const write = lastWrite()
    expect(write.balance_amount).toBe(17500) // 350 € − 175 €
    expect(write.balance_method).toBe('check')
    expect(write.balance_paid_at).toBeTruthy()
    // Le solde ne touche pas au statut : c'est l'expédition qui avance la timeline.
    expect(write).not.toHaveProperty('status')
  })
})
