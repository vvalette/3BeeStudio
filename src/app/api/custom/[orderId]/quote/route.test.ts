import { describe, it, expect, vi, beforeEach } from 'vitest'

// Même mock Supabase chainable que src/app/api/stripe/webhook/route.test.ts,
// étendu à `like`/`limit` dont se sert la numérotation des devis.
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

type SentEmail = {
  attachments?: Array<{ filename: string; content: string }>
  subject: string
}
type SendResult = { data: { id: string } | null; error: { message: string } | null }
const sendMock = vi.hoisted(() =>
  vi.fn<(payload: SentEmail) => Promise<SendResult>>(async () => ({ data: { id: 'email_1' }, error: null })),
)
const sessionCreate = vi.hoisted(() =>
  vi.fn(async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' })),
)

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: supabaseMock, supabase: supabaseMock }))
vi.mock('@/lib/stripe', () => ({ stripe: { checkout: { sessions: { create: sessionCreate } } } }))
vi.mock('@/lib/auth', () => ({ isAuthenticated: vi.fn(async () => true) }))
vi.mock('resend', () => ({ Resend: class { emails = { send: sendMock } } }))

import { POST } from './route'
import { isAuthenticated } from '@/lib/auth'

const ORDER = {
  id: '8c063e3e-76d6-4f48-a9e0-d397ac454b20',
  name: 'Jean Dupont',
  company: null,
  email: 'jean@exemple.fr',
  phone: '',
  project_type: 'deco',
  description: 'Dix caches de poteau en PETG.',
  shipping_address: null, shipping_city: null, shipping_postal_code: null,
  deposit_amount: null, total_amount: null,
  quote_number: null, quote_object: null, quote_items: null, quote_issued_at: null,
}

const params = Promise.resolve({ orderId: ORDER.id })

function request(body: unknown) {
  return new Request('http://localhost/api/custom/x/quote', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const ITEMS = [{ label: 'Cache en H', detail: 'PETG', quantity: 10, unit_price: 350 }]

beforeEach(() => {
  state.reset()
  sendMock.mockClear()
  sessionCreate.mockClear()
  vi.mocked(isAuthenticated).mockResolvedValue(true)
})

describe('POST /api/custom/[orderId]/quote', () => {
  it('refuse un appel non authentifié', async () => {
    vi.mocked(isAuthenticated).mockResolvedValue(false)
    const res = await POST(request({ deposit_amount: 1750 }), { params })
    expect(res.status).toBe(401)
  })

  it('joint le devis PDF à l’email et alloue le numéro suivant', async () => {
    state.queue('custom_orders',
      { data: ORDER, error: null },                                  // lecture de la demande
      { data: [{ quote_number: 'DEV-2026-003' }], error: null },      // dernier numéro de l'année
      { data: null, error: null },                                    // update
    )

    const res = await POST(request({ deposit_amount: 1750, quote_items: ITEMS, quote_object: 'dix caches' }), { params })
    expect(res.status).toBe(200)

    const json = await res.json() as { quote_number: string; total_amount: number }
    expect(json.quote_number).toBe('DEV-2026-004')
    // Le total vient des lignes, jamais d'un champ libre : 10 x 3,50 €
    expect(json.total_amount).toBe(3500)

    const email = sendMock.mock.calls[0][0] as SentEmail
    expect(email.attachments).toHaveLength(1)
    expect(email.attachments![0].filename).toBe('Devis_3BeeStudio_DEV-2026-004_Jean_Dupont.pdf')
    expect(Buffer.from(email.attachments![0].content, 'base64').subarray(0, 5).toString()).toBe('%PDF-')
    expect(email.subject).toContain('DEV-2026-004')

    const write = state.writes.at(-1)!
    expect(write.values.status).toBe('quote_sent')
    expect(write.values.total_amount).toBe(3500)
    expect(write.values.quote_items).toEqual(ITEMS)
  })

  it('démarre à 001 quand l’année n’a pas encore de devis', async () => {
    state.queue('custom_orders',
      { data: ORDER, error: null },
      { data: [], error: null },
      { data: null, error: null },
    )
    const res = await POST(request({ deposit_amount: 1750, quote_items: ITEMS }), { params })
    const json = await res.json() as { quote_number: string }
    expect(json.quote_number).toMatch(/^DEV-\d{4}-001$/)
  })

  it('reprend le numéro suivant si celui visé vient d’être pris', async () => {
    state.queue('custom_orders',
      { data: ORDER, error: null },
      { data: [{ quote_number: 'DEV-2026-003' }], error: null },
      { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "custom_orders_quote_number_key"' } },
      { data: [{ quote_number: 'DEV-2026-004' }], error: null },
      { data: null, error: null },
    )
    const res = await POST(request({ deposit_amount: 1750, quote_items: ITEMS }), { params })
    expect(res.status).toBe(200)
    expect((await res.json() as { quote_number: string }).quote_number).toBe('DEV-2026-005')
  })

  it('refuse un acompte supérieur au total du devis', async () => {
    state.queue('custom_orders', { data: ORDER, error: null })
    const res = await POST(request({ deposit_amount: 9000, quote_items: ITEMS }), { params })
    expect(res.status).toBe(422)
    expect((await res.json() as { error: string }).error).toContain('dépasse')
    expect(sendMock).not.toHaveBeenCalled()
  })

  it('fabrique une ligne de repli quand aucune n’est fournie', async () => {
    state.queue('custom_orders',
      { data: ORDER, error: null },
      { data: [], error: null },
      { data: null, error: null },
    )
    const res = await POST(request({ deposit_amount: 1750, total_amount: 3500 }), { params })
    expect(res.status).toBe(200)
    const write = state.writes.at(-1)!
    expect(write.values.quote_items).toHaveLength(1)
    expect(write.values.total_amount).toBe(3500)
  })

  it('signale un échec d’email sans perdre le devis', async () => {
    state.queue('custom_orders',
      { data: ORDER, error: null },
      { data: [], error: null },
      { data: null, error: null },
    )
    sendMock.mockResolvedValueOnce({ data: null, error: { message: 'domain not verified' } } as never)
    const res = await POST(request({ deposit_amount: 1750, quote_items: ITEMS }), { params })
    expect(res.status).toBe(502)
    // Le devis est enregistré : l'admin n'a qu'à transmettre le lien lui-même.
    expect(state.writes.at(-1)!.values.status).toBe('quote_sent')
  })
})
