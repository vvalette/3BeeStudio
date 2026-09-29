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


const sendMock = vi.hoisted(() => vi.fn(async () => ({ data: { id: 'email_1' }, error: null })))
const sessionCreate = vi.hoisted(() =>
  vi.fn(async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' })),
)
const closeMock = vi.hoisted(() => vi.fn(async (): Promise<'closed' | 'paid'> => 'closed'))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: supabaseMock, supabase: supabaseMock }))
vi.mock('@/lib/auth', () => ({ isAuthenticated: vi.fn(async () => true) }))
vi.mock('@/lib/stripe', () => ({ stripe: { checkout: { sessions: { create: sessionCreate } } } }))
vi.mock('resend', () => ({ Resend: class { emails = { send: sendMock } } }))
vi.mock('@/lib/checkout-session', () => ({ closePreviousCheckout: closeMock }))

import { POST } from './route'

const ORDER = {
  id: '8c063e3e-76d6-4f48-a9e0-d397ac454b20',
  name: 'Jean Dupont',
  email: 'jean@exemple.fr',
  project_type: 'deco',
  status: 'in_production',
  deposit_amount: 17500, deposit_paid_at: '2026-08-20T10:00:00Z', deposit_method: 'transfer',
  total_amount: 35000,
  balance_amount: null, balance_paid_at: null, balance_method: null,
  balance_payment_url: null, balance_session_id: null,
}

const params = Promise.resolve({ orderId: ORDER.id })

function request(body: unknown) {
  return new Request('http://localhost/api/admin/custom/x/balance', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** Ni lien de paiement, ni email, ni écriture : la demande n'est pas partie. */
function expectNothingSent() {
  expect(sessionCreate).not.toHaveBeenCalled()
  expect(sendMock).not.toHaveBeenCalled()
  expect(state.writes).toHaveLength(0)
}

beforeEach(() => {
  state.reset()
  sendMock.mockClear()
  sessionCreate.mockClear()
  closeMock.mockReset()
  closeMock.mockResolvedValue('closed')
  process.env.RESEND_FROM_EMAIL = 'studio@exemple.fr'
})

describe('POST /api/admin/custom/[orderId]/balance', () => {
  it('une demande renvoyée ferme le lien de la précédente', async () => {
    state.queue('custom_orders', { data: { ...ORDER, balance_session_id: 'cs_old' }, error: null }, { data: null, error: null })
    const res = await POST(request({ payment_mode: 'transfer' }), { params })
    expect(res.status).toBe(200)
    expect(closeMock).toHaveBeenCalledWith('cs_old')
  })

  it('refuse si le client vient de régler le lien précédent', async () => {
    closeMock.mockResolvedValueOnce('paid')
    state.queue('custom_orders', { data: { ...ORDER, balance_session_id: 'cs_old' }, error: null })
    const res = await POST(request({}), { params })
    expect(res.status).toBe(409)
    expectNothingSent()
  })

  it('acompte < total : réclame total − acompte par défaut', async () => {
    state.queue('custom_orders', { data: ORDER, error: null }, { data: null, error: null })
    const res = await POST(request({}), { params })
    expect(res.status).toBe(200)
    expect((await res.json() as { balance_amount: number }).balance_amount).toBe(17500)
    expect(sendMock).toHaveBeenCalledTimes(1)
  })

  it('acompte = total : refuse, sans lien ni email', async () => {
    // Même avec un solde fantôme stocké, comme sur 79e3707b.
    state.queue('custom_orders', {
      data: { ...ORDER, total_amount: 4000, deposit_amount: 4000, balance_amount: 4000 },
      error: null,
    })
    const res = await POST(request({ payment_mode: 'transfer' }), { params })
    expect(res.status).toBe(422)
    expectNothingSent()
  })

  it('refuse un montant au-delà de total − acompte', async () => {
    state.queue('custom_orders', { data: ORDER, error: null })
    const res = await POST(request({ balance_amount: 17501 }), { params })
    expect(res.status).toBe(422)
    expectNothingSent()
  })

  it('refuse tant qu’aucun total n’est enregistré', async () => {
    state.queue('custom_orders', { data: { ...ORDER, total_amount: null }, error: null })
    const res = await POST(request({ balance_amount: 5000 }), { params })
    expect(res.status).toBe(422)
    expectNothingSent()
  })

  it('acompte = 0 : le solde est le total', async () => {
    state.queue('custom_orders', { data: { ...ORDER, deposit_amount: 0 }, error: null }, { data: null, error: null })
    const res = await POST(request({ payment_mode: 'transfer' }), { params })
    expect(res.status).toBe(200)
    expect((await res.json() as { balance_amount: number }).balance_amount).toBe(35000)
    expect(sessionCreate).not.toHaveBeenCalled() // virement : pas de lien
  })
})
