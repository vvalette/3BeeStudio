/**
 * POST /api/admin/custom/[orderId]/payment
 *
 * Déclare un encaissement reçu hors Stripe : virement, espèces, chèque. Sans
 * cette route, un acompte réglé par virement n'aurait jamais de date
 * d'encaissement — aucun webhook ne passe pour le poser — et la fiche resterait
 * bloquée sur « en attente de règlement ».
 *
 * Elle sert aussi aux demandes négociées ailleurs, dont l'acompte est encaissé
 * avant qu'un devis ne parte de l'app : rien n'est envoyé au client ici, ni
 * email ni lien de paiement.
 *
 * `received: false` annule la déclaration (erreur de saisie), sans jamais faire
 * reculer une demande déjà en production ou expédiée : seul le statut
 * `deposit_paid` revient à `quote_sent`.
 *
 * Invariant tenu ici et non dans l'UI : l'encaissé ne dépasse jamais le total du
 * projet. Un solde se déclare donc seulement s'il existe un total, et dans la
 * limite de `total − acompte`.
 *
 * `kind: 'balance', clear: true` efface un solde fantôme (montant stocké au-delà
 * du plafond, ou encaissé > total). Refusé sur un solde réglé par Stripe : cet
 * argent-là est réellement arrivé, il se rembourse, il ne s'efface pas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { isAuthenticated } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import {
  balanceAnomaly,
  balanceCap,
  computeBalance,
  paymentState,
  type CustomOrder,
  type CustomOrderStatus,
} from '@/types/custom-order'
import type { Database } from '@/types/database'

type CustomOrderUpdate = Database['public']['Tables']['custom_orders']['Update']

const schema = z.object({
  kind:     z.enum(['deposit', 'balance']),
  received: z.boolean().default(true),
  /** Montant réellement encaissé, en centimes. Défaut : ce qui était attendu. */
  amount:   z.number().int().positive().optional(),
  /** Date d'encaissement (`YYYY-MM-DD` ou ISO). Défaut : maintenant. */
  paid_at:  z.string().min(4).optional(),
  /**
   * Total du projet, quand l'acompte est encaissé sans qu'aucun devis ne soit
   * passé par l'app (accord en DM, virement déjà reçu). Sans lui, le solde n'a
   * rien à déduire et la facture n'a rien à imprimer.
   */
  total_amount: z.number().int().positive().optional(),
  method:   z.enum(['transfer', 'cash', 'check', 'stripe']).default('transfer'),
  /** Avec `kind: 'balance'` : supprime un solde incohérent au lieu de le déclarer. */
  clear:    z.boolean().optional(),
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

  if (parsed.data.clear) {
    if (kind !== 'balance') {
      return NextResponse.json({ error: 'Seul un solde peut être supprimé.' }, { status: 422 })
    }
    return clearBalance(order)
  }

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
      // Total connu seulement de l'admin sur une demande sans devis : on le pose
      // ici, sinon `computeBalance` et la facture resteraient sans référence.
      const total = parsed.data.total_amount ?? order.total_amount
      if (total && amount > total) {
        return NextResponse.json(
          { error: 'L\'acompte dépasse le total du projet.' },
          { status: 422 },
        )
      }
      // Un solde déjà encaissé compte aussi : acompte + solde ne dépassent pas le total.
      const balancePaid = order.balance_paid_at ? order.balance_amount ?? 0 : 0
      if (total && amount + balancePaid > total) {
        return NextResponse.json(
          { error: `Encaissement refusé : l'encaissé dépasserait le total du projet (${euros(total)}).` },
          { status: 422 },
        )
      }

      patch.deposit_amount  = amount
      patch.deposit_paid_at = paidAt.toISOString()
      patch.deposit_method  = method
      if (parsed.data.total_amount) patch.total_amount = parsed.data.total_amount
      if (BUMPABLE.includes(order.status)) patch.status = 'deposit_paid'
    } else {
      patch.deposit_paid_at = null
      patch.deposit_method  = null
      if (order.status === 'deposit_paid') patch.status = 'quote_sent'
    }
  } else {
    if (received) {
      const cap = balanceCap(order)
      if (cap === null) {
        return NextResponse.json(
          { error: 'Renseigne d\'abord le total du projet : sans lui, le solde n\'a pas de référence.' },
          { status: 422 },
        )
      }
      if (cap === 0) {
        return NextResponse.json(
          { error: 'Aucun solde à encaisser : l\'acompte couvre déjà le total du projet.' },
          { status: 422 },
        )
      }
      const amount = parsed.data.amount ?? computeBalance(order)!
      if (amount > cap) {
        return NextResponse.json(
          { error: `Encaissement refusé : le solde ne peut dépasser ${euros(cap)} (total moins acompte). Mets le total à jour dans la carte « Devis » si le projet a évolué.` },
          { status: 422 },
        )
      }
      const depositPaid = paymentState(order).depositPaid ? order.deposit_amount ?? 0 : 0
      if (depositPaid + amount > order.total_amount!) {
        return NextResponse.json(
          { error: `Encaissement refusé : l'encaissé dépasserait le total du projet (${euros(order.total_amount!)}).` },
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

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`
}

/**
 * Efface un solde fantôme sans toucher à l'acompte. Un lien Stripe encore ouvert
 * est expiré : cliqué plus tard, il encaisserait un solde qui n'existe pas.
 */
async function clearBalance(order: CustomOrder) {
  const anomaly = balanceAnomaly(order)
  if (!anomaly) {
    return NextResponse.json({ error: 'Ce solde est cohérent avec le total : rien à supprimer.' }, { status: 409 })
  }
  if (anomaly.paidByStripe) {
    return NextResponse.json(
      { error: 'Solde réglé par carte : l\'argent est arrivé. Rembourse-le depuis Stripe plutôt que de l\'effacer.' },
      { status: 409 },
    )
  }

  if (order.balance_session_id && !order.balance_paid_at) {
    try {
      await stripe.checkout.sessions.expire(order.balance_session_id)
    } catch (err) {
      // Session déjà expirée ou close : rien à fermer.
      console.warn('[custom/payment] Session de solde non expirée:', err instanceof Error ? err.message : err)
    }
  }

  const { data, error } = await supabaseAdmin
    .from('custom_orders')
    .update({
      balance_amount:      null,
      balance_payment_url: null,
      balance_session_id:  null,
      balance_paid_at:     null,
      balance_method:      null,
      updated_at:          new Date().toISOString(),
    })
    .eq('id', order.id)
    .select()
    .single()

  if (error) {
    console.error('[custom/payment] Erreur Supabase:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.info('[custom/payment]', JSON.stringify({ orderId: order.id, kind: 'balance', cleared: anomaly }))
  return NextResponse.json(data)
}
