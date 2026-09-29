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
        if (op === 'eq' || op === 'is') record.filters.push([args[0] as string, args[1]])
        return proxy
      }
    for (const op of ['update', 'insert', 'delete', 'select', 'eq', 'is', 'in', 'maybeSingle', 'single', 'order']) {
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

  describe('sur-mesure', () => {
    const unpaid = {
      id: 'cu_1', status: 'quote_sent',
      deposit_paid_at: null, deposit_method: null, stripe_checkout_session_id: 'cs_test',
      balance_paid_at: null, balance_method: null, balance_session_id: null,
    }

    it('acompte payé → deposit_paid + encaissement horodaté', async () => {
      state.queue('custom_orders', { data: unpaid, error: null }, { data: null, error: null })
      const res = await POST(
        webhookRequest(completedSession({ custom_order_id: 'cu_1', type: 'custom_deposit' })),
      )

      expect(res.status).toBe(200)
      expect(state.writes[0]).toMatchObject({
        table: 'custom_orders',
        op: 'update',
        values: { status: 'deposit_paid', deposit_method: 'stripe' },
        filters: [['id', 'cu_1'], ['deposit_paid_at', null]],
      })
      expect((state.writes[0].values as { deposit_paid_at: string }).deposit_paid_at).toBeTruthy()
    })

    it('acompte payé alors que la demande a déjà avancé → encaissement posé, statut intact', async () => {
      state.queue('custom_orders', { data: { ...unpaid, status: 'in_production' }, error: null }, { data: null, error: null })
      await POST(webhookRequest(completedSession({ custom_order_id: 'cu_1', type: 'custom_deposit' })))

      expect(state.writes[0].values).not.toHaveProperty('status')
      expect(state.writes[0].values).toHaveProperty('deposit_paid_at')
    })

    it('échec DB sur l\'acompte → 500 pour que Stripe retente + alerte', async () => {
      state.queue('custom_orders', { data: unpaid, error: null }, { data: null, error: { message: 'boom' } })
      const res = await POST(
        webhookRequest(completedSession({ custom_order_id: 'cu_1', type: 'custom_deposit' })),
      )

      expect(res.status).toBe(500)
      expect(sendCriticalAlert).toHaveBeenCalled()
    })

    it('rejeu du même paiement → rien d\'écrit, aucune alerte', async () => {
      state.queue('custom_orders', { data: { ...unpaid, deposit_paid_at: '2026-09-01', deposit_method: 'stripe' }, error: null })
      const res = await POST(
        webhookRequest(completedSession({ custom_order_id: 'cu_1', type: 'custom_deposit' })),
      )

      expect(res.status).toBe(200)
      expect(state.writes).toHaveLength(0)
      expect(sendCriticalAlert).not.toHaveBeenCalled()
    })

    it('second acompte payé sur un autre lien → alerte remboursement, rien d\'écrasé', async () => {
      state.queue('custom_orders', {
        data: { ...unpaid, deposit_paid_at: '2026-09-01', deposit_method: 'transfer' },
        error: null,
      })
      const res = await POST(
        webhookRequest(completedSession({ custom_order_id: 'cu_1', type: 'custom_deposit' })),
      )

      expect(res.status).toBe(200)
      expect(state.writes).toHaveLength(0)
      expect(sendCriticalAlert).toHaveBeenCalledWith(expect.stringContaining('deux fois'), expect.anything())
    })

    it('solde payé → balance_paid_at sans toucher au statut', async () => {
      state.queue('custom_orders', { data: { ...unpaid, status: 'in_production', balance_session_id: 'cs_test' }, error: null }, { data: null, error: null })
      await POST(webhookRequest(completedSession({ custom_order_id: 'cu_1', type: 'custom_balance' })))

      expect(state.writes[0]).toMatchObject({
        values: { balance_method: 'stripe' },
        filters: [['id', 'cu_1'], ['balance_paid_at', null]],
      })
      expect(state.writes[0].values).not.toHaveProperty('status')
    })

    it('paiement différé confirmé (async_payment_succeeded) → acompte enregistré', async () => {
      state.queue('custom_orders', { data: unpaid, error: null }, { data: null, error: null })
      await POST(webhookRequest({
        ...completedSession({ custom_order_id: 'cu_1', type: 'custom_deposit' }),
        type: 'checkout.session.async_payment_succeeded',
      }))

      expect(state.writes[0].values).toMatchObject({ status: 'deposit_paid' })
    })

    it('payment_intent.succeeded → retrouve l\'acompte via la session', async () => {
      stripeMock.checkout.sessions.list.mockResolvedValueOnce({
        data: [{ id: 'cs_test', metadata: { custom_order_id: 'cu_1', type: 'custom_deposit' } }],
      } as never)
      state.queue('custom_orders', { data: unpaid, error: null }, { data: null, error: null })
      await POST(webhookRequest({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_1', metadata: {} } },
      }))

      expect(state.writes[0].values).toMatchObject({ status: 'deposit_paid' })
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

  it('session expirée → le panier est copié AVANT la suppression de la commande', async () => {
    // Ordre critique : l'instantané lit la commande. Inversé, il lirait une ligne
    // déjà supprimée, ne trouverait rien, et la relance de panier s'éteindrait en
    // silence — aucune erreur, juste plus aucun email envoyé.
    state.queue('shop_orders', {
      data: {
        id: 'so_2', email: 'c@exemple.fr', name: 'Jean Dupont', locale: 'fr',
        items: [{ product_id: 'p1', product_name: 'Vase', quantity: 1, unit_price: 2400 }],
        subtotal: 2400, total_amount: 2890, status: 'pending_payment',
      },
      error: null,
    })
    state.queue('abandoned_cart_optouts', { data: null, error: null })

    const res = await POST(
      webhookRequest({
        type: 'checkout.session.expired',
        data: { object: { id: 'cs_test', metadata: { shop_order_id: 'so_2' } } },
      }),
    )

    expect(res.status).toBe(200)
    const ops = state.writes.map((w) => `${w.table}.${w.op}`)
    expect(ops).toEqual(['abandoned_carts.insert', 'shop_orders.delete'])
    expect(state.writes[0].values).toMatchObject({
      email: 'c@exemple.fr',
      name:  'Jean Dupont',
      subtotal: 2400,
    })
    // Le jeton du lien de reprise ne doit jamais être prévisible.
    const { token } = state.writes[0].values as { token: string }
    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/)
  })

  it('session expirée → aucun instantané pour qui a refusé les relances', async () => {
    state.queue('shop_orders', {
      data: {
        id: 'so_3', email: 'stop@exemple.fr', name: 'Jean Dupont', locale: 'fr',
        items: [{ product_id: 'p1', product_name: 'Vase', quantity: 1, unit_price: 2400 }],
        subtotal: 2400, total_amount: 2890, status: 'pending_payment',
      },
      error: null,
    })
    state.queue('abandoned_cart_optouts', { data: { email: 'stop@exemple.fr' }, error: null })

    await POST(
      webhookRequest({
        type: 'checkout.session.expired',
        data: { object: { id: 'cs_test', metadata: { shop_order_id: 'so_3' } } },
      }),
    )

    // Le panier n'est même pas stocké : il ne servirait aucune finalité.
    expect(state.writes.map((w) => `${w.table}.${w.op}`)).toEqual(['shop_orders.delete'])
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
