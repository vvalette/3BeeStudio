import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase chainable — même principe que src/app/api/stripe/webhook/route.test.ts.
const { supabaseMock, state } = vi.hoisted(() => {
  type Result = { data: unknown; error: { message: string } | null }
  const state = {
    tableResults: new Map<string, Result[]>(),
    writes: [] as Array<{ table: string; values: Record<string, unknown> }>,
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
      if (record.op) state.writes.push({ table, values: record.values })
      return Promise.resolve(res).then(onF, onR)
    }
    return proxy
  }

  return { supabaseMock: { from: (t: string) => builder(t) }, state }
})

const boxtal = vi.hoisted(() => ({
  createCustomBoxtalShipment: vi.fn(async () => ({
    boxtalOrderId: 'bxt_123',
    labelUrl: 'https://boxtal.test/label.pdf',
  })),
  getBoxtalLabel: vi.fn(async () => 'https://boxtal.test/label-resigned.pdf'),
  getBoxtalShippingCost: vi.fn(async () => 549),
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: supabaseMock, supabase: supabaseMock }))
vi.mock('@/lib/auth', () => ({ isAuthenticated: vi.fn(async () => true) }))
vi.mock('@/lib/boxtal', () => boxtal)

import { POST } from './route'
import { isAuthenticated } from '@/lib/auth'

const ORDER = {
  id: '8c063e3e-76d6-4f48-a9e0-d397ac454b20',
  name: 'Jean Dupont',
  company: null,
  email: 'jean@exemple.fr',
  phone: '0612345678',
  shipping_name: 'Jean Dupont',
  shipping_address: '12 rue des Lilas',
  shipping_city: 'Paris',
  shipping_postal_code: '75001',
  total_amount: 3500,
  deposit_amount: 1750,
  boxtal_order_id: null,
  status: 'in_production',
}

const params = Promise.resolve({ orderId: ORDER.id })
const PACKAGE = { weight_grams: 400, length_cm: 30, width_cm: 20, height_cm: 10 }

function request(body: unknown = PACKAGE) {
  return new Request('http://localhost/api/admin/custom/x/ship', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  state.reset()
  vi.mocked(isAuthenticated).mockResolvedValue(true)
  boxtal.createCustomBoxtalShipment.mockClear()
  boxtal.getBoxtalLabel.mockClear()
  boxtal.getBoxtalShippingCost.mockClear()
})

describe('POST /api/admin/custom/[orderId]/ship', () => {
  it('refuse un appel non authentifié', async () => {
    vi.mocked(isAuthenticated).mockResolvedValue(false)
    expect((await POST(request(), { params })).status).toBe(401)
  })

  it('renvoie 404 sur une demande inconnue', async () => {
    state.queue('custom_orders', { data: null, error: { message: 'not found' } })
    expect((await POST(request(), { params })).status).toBe(404)
  })

  it('crée l’expédition et enregistre colis, identifiant et coût', async () => {
    state.queue('custom_orders', { data: ORDER, error: null }, { data: null, error: null })

    const res = await POST(request(), { params })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      label_url: 'https://boxtal.test/label.pdf',
      boxtal_order_id: 'bxt_123',
      shipping_cost: 549,
    })

    // Les grammes saisis deviennent des kilos pour Boxtal.
    expect(boxtal.createCustomBoxtalShipment).toHaveBeenCalledWith(
      expect.objectContaining({ id: ORDER.id }),
      { weight: 0.4, length: 30, width: 20, height: 10 },
    )

    const write = state.writes.at(-1)!
    expect(write.values).toMatchObject({
      boxtal_order_id: 'bxt_123',
      package_weight_grams: 400,
      package_length_cm: 30,
      shipping_cost: 549,
    })
    // Le passage en « expédié » revient au webhook Boxtal, à la prise en charge.
    expect(write.values.status).toBeUndefined()
  })

  it('re-télécharge l’étiquette sans recréer l’expédition', async () => {
    state.queue('custom_orders', { data: { ...ORDER, boxtal_order_id: 'bxt_existant' }, error: null })

    const res = await POST(request(), { params })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ label_url: 'https://boxtal.test/label-resigned.pdf' })
    expect(boxtal.getBoxtalLabel).toHaveBeenCalledWith('bxt_existant')
    expect(boxtal.createCustomBoxtalShipment).not.toHaveBeenCalled()
  })

  it('refuse une adresse incomplète', async () => {
    state.queue('custom_orders', { data: { ...ORDER, shipping_city: null }, error: null })
    const res = await POST(request(), { params })
    expect(res.status).toBe(400)
    expect((await res.json() as { error: string }).error).toContain('Adresse')
  })

  it('refuse une demande sans téléphone', async () => {
    // Cas typique d'une demande saisie à la main depuis un DM Instagram.
    state.queue('custom_orders', { data: { ...ORDER, phone: '' }, error: null })
    const res = await POST(request(), { params })
    expect(res.status).toBe(400)
    expect((await res.json() as { error: string }).error).toContain('téléphone')
  })

  it('refuse un colis sans poids', async () => {
    state.queue('custom_orders', { data: ORDER, error: null })
    const res = await POST(request({ length_cm: 30, width_cm: 20, height_cm: 10 }), { params })
    expect(res.status).toBe(422)
    expect(boxtal.createCustomBoxtalShipment).not.toHaveBeenCalled()
  })

  it('rend l’étiquette même si l’enregistrement échoue', async () => {
    // L'expédition existe chez Boxtal : masquer l'étiquette ferait payer deux fois.
    state.queue('custom_orders',
      { data: ORDER, error: null },
      { data: null, error: { message: 'colonne inconnue' } },
    )
    const res = await POST(request(), { params })
    expect(res.status).toBe(200)
    const json = await res.json() as { label_url: string; warning?: string }
    expect(json.label_url).toBe('https://boxtal.test/label.pdf')
    expect(json.warning).toContain('bxt_123')
  })

  it('n’échoue pas si le coût n’est pas encore connu', async () => {
    boxtal.getBoxtalShippingCost.mockResolvedValueOnce(null as never)
    state.queue('custom_orders', { data: ORDER, error: null }, { data: null, error: null })
    const res = await POST(request(), { params })
    expect(res.status).toBe(200)
    expect(state.writes.at(-1)!.values.shipping_cost).toBeUndefined()
  })
})
