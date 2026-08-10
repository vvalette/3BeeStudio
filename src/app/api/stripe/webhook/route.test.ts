import { describe, it, expect, vi, beforeEach } from 'vitest'

// Même mock Supabase chainable que confirm-shop-order.test.ts — voir ce fichier pour le détail.
const { supabaseMock, state } = vi.hoisted(() => {
  type Result = { data: unknown; error: { message: string } | null }
  const state = {
    tableResults: new Map<string, Result[]>(),
    writes: [] as Array<{ table: string; op: string; values: unknown; filters: Array<[string, unknown]> }>,
    reset() {
      this.tableResults.clear()
      this.writes.length = 0
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
    rpc: vi.fn(async () => ({ data: null, error: null })),
  }
  return { supabaseMock, state }
})

const stripeMock = vi.hoisted(() => ({
  webhooks: {
    // Par défaut : la signature est acceptée et l'event est le corps JSON de la requête.
    constructEvent: vi.fn((body: string) => JSON.parse(body)),
  },
  checkout: {
    sessions: {
      list: vi.fn(async () => ({ data: [] })),
    },
  },
}))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: supabaseMock, supabase: supabaseMock }))
vi.mock('@/lib/stripe', () => ({ stripe: stripeMock }))
vi.mock('@/lib/resend', () => ({ sendNfcOrderEmails: vi.fn(async () => {}) }))
vi.mock('@/lib/alert', () => ({ sendCriticalAlert: vi.fn(async () => {}) }))
vi.mock('@/lib/confirm-shop-order', () => ({ confirmShopOrder: vi.fn(async () => ({})) }))

import { POST } from './route'
import { confirmShopOrder } from '@/lib/confirm-shop-order'
import { sendNfcOrderEmails } from '@/lib/resend'
import { sendCriticalAlert } from '@/lib/alert'

function webhookRequest(event: object, sig = 'sig_test'): Request {
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    body: JSON.stringify(event),
    headers: sig ? { 'stripe-signature': sig } : {},
  })
}

function completedSession(metadata: Record<string, string>, paymentStatus = 'paid') {
  return {
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test', payment_status: paymentStatus, metadata } },
  }
}

beforeEach(() => {
  state.reset()
  vi.clearAllMocks()
  stripeMock.webhooks.constructEvent.mockImplementation((body: string) => JSON.parse(body))
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
})

describe('POST /api/stripe/webhook', () => {
  it('refuse une requête sans header stripe-signature', async () => {
    const res = await POST(webhookRequest({ type: 'x' }, ''))
    expect(res.status).toBe(400)
  })

  it('refuse une signature invalide', async () => {
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('bad signature')
    })
    const res = await POST(webhookRequest({ type: 'checkout.session.completed' }))
    expect(res.status).toBe(400)
  })

  it('commande boutique payée → confirmShopOrder', async () => {
    const res = await POST(
      webhookRequest(completedSession({ shop_order_id: 'so_1', type: 'shop_order' })),
    )
    expect(res.status).toBe(200)
    expect(confirmShopOrder).toHaveBeenCalledWith('so_1')
  })

  it('échec de confirmation boutique → 500 pour que Stripe retente', async () => {
    vi.mocked(confirmShopOrder).mockResolvedValueOnce({ error: true })
    const res = await POST(
      webhookRequest(completedSession({ shop_order_id: 'so_1', type: 'shop_order' })),
    )
    expect(res.status).toBe(500)
  })

  it('session boutique non payée (paiement asynchrone) → pas de confirmation', async () => {
    const res = await POST(
      webhookRequest(completedSession({ shop_order_id: 'so_1', type: 'shop_order' }, 'unpaid')),
    )
    expect(res.status).toBe(200)
    expect(confirmShopOrder).not.toHaveBeenCalled()
  })

  it('commande NFC payée → statut confirmé + email', async () => {
    state.queue('orders', { data: { id: 'ord_1', email: 'c@exemple.fr' }, error: null })
    const res = await POST(webhookRequest(completedSession({ order_id: 'ord_1' })))

    expect(res.status).toBe(200)
    expect(state.writes[0]).toMatchObject({
      table: 'orders',
      op: 'update',
      values: { status: 'confirmed' },
      filters: [['id', 'ord_1'], ['status', 'pending_payment']],
    })
    expect(sendNfcOrderEmails).toHaveBeenCalledOnce()
  })

  it('rejeu NFC (déjà confirmée) → 200 sans email ni alerte', async () => {
    state.queue('orders', { data: null, error: null }) // maybeSingle : 0 ligne, pas d’erreur
    const res = await POST(webhookRequest(completedSession({ order_id: 'ord_1' })))

    expect(res.status).toBe(200)
    expect(sendNfcOrderEmails).not.toHaveBeenCalled()
    expect(sendCriticalAlert).not.toHaveBeenCalled()
  })

  it('échec DB NFC → 500 + alerte critique', async () => {
    state.queue('orders', { data: null, error: { message: 'boom' } })
    const res = await POST(webhookRequest(completedSession({ order_id: 'ord_1' })))

    expect(res.status).toBe(500)
    expect(sendCriticalAlert).toHaveBeenCalledOnce()
  })

  it('acompte sur-mesure payé → custom_orders passe en deposit_paid', async () => {
    state.queue('custom_orders', { data: null, error: null })
    const res = await POST(
      webhookRequest(completedSession({ custom_order_id: 'cu_1', type: 'custom_deposit' })),
    )

    expect(res.status).toBe(200)
    expect(state.writes[0]).toMatchObject({
      table: 'custom_orders',
      op: 'update',
      values: { status: 'deposit_paid' },
      filters: [['id', 'cu_1'], ['status', 'quote_sent']],
    })
  })

  it('session expirée → commande fantôme supprimée + promo newsletter libérée', async () => {
    const res = await POST(
      webhookRequest({
        type: 'checkout.session.expired',
        data: {
          object: {
            id: 'cs_test',
            metadata: { shop_order_id: 'so_1', newsletter_promo_email: 'c@exemple.fr' },
          },
        },
      }),
    )

    expect(res.status).toBe(200)
    expect(state.writes).toEqual([
      expect.objectContaining({
        table: 'shop_orders',
        op: 'delete',
        filters: [['id', 'so_1'], ['status', 'pending_payment']],
      }),
      expect.objectContaining({
        table: 'newsletter_subscriptions',
        op: 'update',
        values: { promo_used: false },
        filters: [['email', 'c@exemple.fr']],
      }),
    ])
  })

  it('payment_intent.succeeded sans metadata → retrouve la commande via la session', async () => {
    stripeMock.checkout.sessions.list.mockResolvedValueOnce({
      data: [{ metadata: { shop_order_id: 'so_9' } }],
    } as never)

    const res = await POST(
      webhookRequest({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_1', metadata: {} } },
      }),
    )

    expect(res.status).toBe(200)
    expect(stripeMock.checkout.sessions.list).toHaveBeenCalledWith({ payment_intent: 'pi_1', limit: 1 })
    expect(confirmShopOrder).toHaveBeenCalledWith('so_9')
  })
})
