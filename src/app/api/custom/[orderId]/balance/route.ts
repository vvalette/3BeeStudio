/**
 * POST /api/custom/[orderId]/balance
 * Réclame le solde d'un projet sur-mesure : envoie la demande au client, avec
 * un second lien de paiement Stripe, ou sans lien si le règlement se fait par
 * virement. Appelé par l'admin quand la pièce est prête,
 * avant expédition — l'acompte a lancé la production, le solde la libère.
 *
 * Symétrique de `./quote/route.ts` (acompte), mais sans toucher au statut : la
 * timeline client reste `in_production` jusqu'à l'expédition. L'état du solde
 * vit dans ses propres colonnes.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { isAuthenticated } from '@/lib/auth'
import { Resend } from 'resend'
import { computeBalance, type CustomOrder } from '@/types/custom-order'
import { render } from 'react-email'
import CustomBalance from '@/emails/CustomBalance'

const schema = z.object({
  /** Montant en centimes. Omis → total estimé moins l'acompte. */
  balance_amount: z.number().int().positive().optional(),
  /**
   * `transfer` : aucun lien Stripe. L'email annonce le solde, le virement
   * arrive, et l'admin le déclare depuis la fiche.
   */
  payment_mode:   z.enum(['stripe', 'transfer']).default('stripe'),
})

const resend = new Resend(process.env.RESEND_API_KEY)

/** Réclamer le solde n'a de sens qu'une fois l'acompte encaissé. */
const PAYABLE_STATUSES = ['deposit_paid', 'in_production', 'shipped', 'delivered']

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
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
    return NextResponse.json({ error: 'Montant invalide', details: parsed.error.flatten() }, { status: 422 })
  }

  const { data: orderRaw, error: fetchError } = await supabaseAdmin
    .from('custom_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (fetchError || !orderRaw) {
    return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
  }

  const order = orderRaw as CustomOrder

  if (order.balance_paid_at) {
    return NextResponse.json({ error: 'Le solde a déjà été réglé.' }, { status: 409 })
  }
  if (!PAYABLE_STATUSES.includes(order.status)) {
    return NextResponse.json(
      { error: 'L\'acompte doit être encaissé avant de réclamer le solde.' },
      { status: 409 },
    )
  }

  const amount = parsed.data.balance_amount ?? computeBalance(order)
  if (!amount || amount <= 0) {
    return NextResponse.json(
      { error: 'Aucun solde à réclamer — renseignez le total estimé ou saisissez un montant.' },
      { status: 422 },
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const transfer = parsed.data.payment_mode === 'transfer'

  // Pas de lien laissé ouvert quand le règlement se fait par virement : il
  // finirait par être cliqué, et le solde serait encaissé deux fois.
  const session = transfer ? null : await stripe.checkout.sessions.create({
    mode: 'payment',
    locale: 'fr',
    customer_email: order.email,
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: amount,
        product_data: {
          name: `Solde — Projet sur-mesure #${orderId.slice(0, 8).toUpperCase()}`,
          description: order.project_type,
        },
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/custom/${orderId}?payment=balance`,
    cancel_url:  `${appUrl}/custom/${orderId}`,
    metadata: { custom_order_id: orderId, type: 'custom_balance' },
  })

  const { error: updateError } = await supabaseAdmin
    .from('custom_orders')
    .update({
      balance_amount:      amount,
      balance_payment_url: session?.url ?? null,
      balance_session_id:  session?.id ?? null,
      updated_at:          new Date().toISOString(),
    })
    .eq('id', orderId)

  if (updateError) {
    console.error('[custom/balance] Erreur Supabase:', updateError)
    return NextResponse.json({ error: 'Lien créé mais non enregistré — réessayez.' }, { status: 500 })
  }

  const from = process.env.RESEND_FROM_EMAIL!
  const html = await render(CustomBalance({
    order,
    amount,
    appUrl,
    paymentUrl: session?.url ?? null,
  }))

  const { error: emailError } = await resend.emails.send({
    from,
    replyTo: 'contact@3beestudio.fr',
    to: order.email,
    subject: `Votre projet est prêt — solde à régler #${orderId.slice(0, 8).toUpperCase()}`,
    html,
  })

  if (emailError) {
    console.error('[custom/balance] ERREUR envoi:', JSON.stringify(emailError))
    // Le lien est enregistré et visible sur la page de suivi : la demande n'est
    // pas perdue, seul l'email a échoué.
    return NextResponse.json(
      {
        error: transfer
          ? 'Solde enregistré, mais l\'email n\'est pas parti — prévenez le client vous-même.'
          : 'Lien de paiement créé, mais l\'email n\'est pas parti — transmettez-le au client.',
        payment_url: session?.url ?? null,
      },
      { status: 502 },
    )
  }

  console.info('[custom/balance]', JSON.stringify({ orderId, amount, sessionId: session?.id ?? null, payment_mode: parsed.data.payment_mode }))

  return NextResponse.json({
    session_id:  session?.id ?? null,
    payment_url: session?.url ?? null,
    balance_amount: amount,
  })
}
