import { supabaseAdmin } from '@/lib/supabase'
import { sendCriticalAlert } from '@/lib/alert'
import type { CustomOrder } from '@/types/custom-order'

export type CustomPaymentKind = 'deposit' | 'balance'

type PaymentRow = Pick<CustomOrder,
  | 'id' | 'status'
  | 'deposit_paid_at' | 'deposit_method' | 'stripe_checkout_session_id'
  | 'balance_paid_at' | 'balance_method' | 'balance_session_id'>

/** Tant que l'acompte n'est pas là, c'est lui qui fait avancer la timeline. */
const BEFORE_DEPOSIT = ['pending_quote', 'quote_sent']

/**
 * Enregistre un acompte ou un solde sur-mesure réglé par Stripe. Appelé par le
 * webhook, que l'encaissement arrive par `checkout.session.completed`, par le
 * paiement différé (`async_payment_succeeded`) ou par `payment_intent.succeeded`.
 *
 * L'encaissement est posé quel que soit le statut : un acompte payé alors que
 * l'admin avait déjà avancé la demande reste de l'argent reçu, et le CSV lit
 * `deposit_paid_at`. Seule la timeline n'avance que depuis les statuts d'avant
 * acompte.
 *
 * Un second règlement du même montant (ancien lien, ou lien payé après une
 * déclaration de virement) ne s'enregistre pas par-dessus le premier : il
 * déclenche une alerte, c'est un remboursement à faire.
 *
 * Retour : `{ error }` quand la base n'a pas répondu, pour que le webhook
 * renvoie 500 et que Stripe réessaie. Sinon `{}`.
 */
export async function confirmCustomPayment(
  customOrderId: string,
  kind: CustomPaymentKind,
  sessionId: string,
): Promise<{ error?: true }> {
  const label = kind === 'deposit' ? 'acompte' : 'solde'

  const { data, error: readError } = await supabaseAdmin
    .from('custom_orders')
    .select('id, status, deposit_paid_at, deposit_method, stripe_checkout_session_id, balance_paid_at, balance_method, balance_session_id')
    .eq('id', customOrderId)
    .maybeSingle()

  if (readError) {
    console.error(`[confirm-custom-payment] lecture impossible (${label}):`, readError)
    await sendCriticalAlert(`Webhook Stripe — ${label} sur-mesure non enregistré`, {
      customOrderId,
      erreur: readError.message,
      consequence: 'Stripe va retenter — vérifier la fiche si les échecs persistent',
    })
    return { error: true }
  }

  const order = data as PaymentRow | null
  if (!order) {
    await sendCriticalAlert(`Webhook Stripe — ${label} payé pour une demande introuvable`, {
      customOrderId,
      sessionId,
      consequence: 'Argent encaissé sans demande correspondante — rembourser ou recréer la fiche',
    })
    return {}
  }

  const paidAt   = kind === 'deposit' ? order.deposit_paid_at : order.balance_paid_at
  // `null` = demande antérieure à la colonne du moyen, forcément réglée par Stripe.
  const method   = (kind === 'deposit' ? order.deposit_method : order.balance_method) ?? 'stripe'
  const linkedId = kind === 'deposit' ? order.stripe_checkout_session_id : order.balance_session_id

  if (paidAt) {
    // Rejeu du même paiement : rien à faire.
    if (method === 'stripe' && sessionId === linkedId) return {}

    await sendCriticalAlert(`Sur-mesure — ${label} encaissé deux fois`, {
      customOrderId,
      sessionId,
      premierEncaissement: `${paidAt} (${method})`,
      consequence: 'Le client a payé un lien resté ouvert : rembourser ce paiement depuis Stripe',
    })
    return {}
  }

  const now = new Date().toISOString()
  const values = kind === 'deposit'
    ? {
        deposit_paid_at: now,
        deposit_method:  'stripe' as const,
        ...(BEFORE_DEPOSIT.includes(order.status) ? { status: 'deposit_paid' as const } : {}),
      }
    : { balance_paid_at: now, balance_method: 'stripe' as const }

  const { error } = await supabaseAdmin
    .from('custom_orders')
    .update(values)
    .eq('id', customOrderId)
    .is(kind === 'deposit' ? 'deposit_paid_at' : 'balance_paid_at', null) // course avec un rejeu

  if (error) {
    console.error(`[confirm-custom-payment] Erreur custom_orders (${label}):`, error)
    await sendCriticalAlert(`Webhook Stripe — ${label} sur-mesure non enregistré`, {
      customOrderId,
      erreur: error.message,
      consequence: 'Stripe va retenter — vérifier la fiche si les échecs persistent',
    })
    return { error: true }
  }

  console.info('[webhook]', JSON.stringify({ event: `custom_${kind}_paid`, customOrderId }))
  return {}
}
