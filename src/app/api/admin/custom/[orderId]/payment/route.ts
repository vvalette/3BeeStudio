/**
 * POST /api/admin/custom/[orderId]/payment
 *
 * Déclare un encaissement reçu hors Stripe : virement, espèces, chèque. Sans
 * cette route, un acompte réglé par virement n'aurait jamais de date
 * d'encaissement — aucun webhook ne passe pour le poser — et la fiche resterait
 * bloquée sur « en attente de règlement ».
 *
 * `received: false` annule la déclaration (erreur de saisie), sans jamais faire
 * reculer une demande déjà en production ou expédiée : seul le statut
 * `deposit_paid` revient à `quote_sent`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { computeBalance, type CustomOrder, type CustomOrderStatus } from '@/types/custom-order'
import type { Database } from '@/types/database'

type CustomOrderUpdate = Database['public']['Tables']['custom_orders']['Update']

const schema = z.object({
  kind:     z.enum(['deposit', 'balance']),
  received: z.boolean().default(true),
  /** Montant réellement encaissé, en centimes. Défaut : ce qui était attendu. */
  amount:   z.number().int().positive().optional(),
  /** Date d'encaissement (`YYYY-MM-DD` ou ISO). Défaut : maintenant. */
  paid_at:  z.string().min(4).optional(),
  method:   z.enum(['transfer', 'cash', 'check', 'stripe']).default('transfer'),
})

/** Statuts qu'un encaissement d'acompte fait avancer. Au-delà, la production est déjà lancée. */
const BUMPABLE: CustomOrderStatus[] = ['pending_quote', 'quote_sent']

export async function POST(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { orderId } = await params

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 422 })
  }

  const { kind, received, method } = parsed.data

  const { data: orderRaw, error: fetchError } = await supabaseAdmin
    .from('custom_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (fetchError || !orderRaw) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  }
  const order = orderRaw as CustomOrder

  // Une date d'encaissement dans le futur fausserait la déclaration du trimestre.
  let paidAt = new Date()
  if (parsed.data.paid_at) {
    paidAt = new Date(parsed.data.paid_at)
    if (Number.isNaN(paidAt.getTime())) {
      return NextResponse.json({ error: 'Date d\'encaissement illisible.' }, { status: 422 })
    }
    if (paidAt.getTime() > Date.now() + 24 * 3600 * 1000) {
      return NextResponse.json({ error: 'Date d\'encaissement dans le futur.' }, { status: 422 })
    }
  }

  const patch: CustomOrderUpdate = { updated_at: new Date().toISOString() }

  if (kind === 'deposit') {
    if (received) {
      const amount = parsed.data.amount ?? order.deposit_amount
      if (!amount) {
        return NextResponse.json(
          { error: 'Montant de l\'acompte requis : aucun n\'est enregistré sur la demande.' },
          { status: 422 },
        )
      }
      patch.deposit_amount  = amount
      patch.deposit_paid_at = paidAt.toISOString()
      patch.deposit_method  = method
      if (BUMPABLE.includes(order.status)) patch.status = 'deposit_paid'
    } else {
      patch.deposit_paid_at = null
      patch.deposit_method  = null
      if (order.status === 'deposit_paid') patch.status = 'quote_sent'
    }
  } else {
    if (received) {
      const amount = parsed.data.amount ?? computeBalance(order)
      if (!amount) {
        return NextResponse.json(
          { error: 'Montant du solde requis : il ne se déduit pas du total connu.' },
          { status: 422 },
        )
      }
      patch.balance_amount  = amount
      patch.balance_paid_at = paidAt.toISOString()
      patch.balance_method  = method
    } else {
      patch.balance_paid_at = null
      patch.balance_method  = null
    }
  }

  const { data, error } = await supabaseAdmin
    .from('custom_orders')
    .update(patch)
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    console.error('[custom/payment] Erreur Supabase:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.info('[custom/payment]', JSON.stringify({ orderId, kind, received, method }))
  return NextResponse.json(data)
}
