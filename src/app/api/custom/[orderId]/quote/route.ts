/**
 * POST /api/custom/[orderId]/quote
 * Appelé par l'admin pour envoyer le devis au client : PDF en pièce jointe,
 * lien de paiement Stripe pour l'acompte, et bascule en `quote_sent`.
 * Protégé par le même mot de passe admin que le reste de l'admin panel.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { isAuthenticated } from '@/lib/auth'
import { Resend } from 'resend'
import { buildQuotePdf, quoteFileName, quoteTotal } from '@/lib/quote/pdf'
import { nextQuoteNumber, isQuoteNumberConflict } from '@/lib/quote/number'
import { fallbackQuoteItems, fallbackQuoteObject, quoteItemSchema } from '@/lib/quote/input'
import type { CustomOrder } from '@/types/custom-order'

const schema = z.object({
  deposit_amount: z.number().int().positive(), // en centimes
  /**
   * Total du devis. Ignoré si des lignes sont fournies : c'est leur somme qui
   * fait foi, pour qu'un PDF ne puisse jamais afficher un total différent de
   * celui encaissé.
   */
  total_amount:   z.number().int().positive().optional(),
  quote_object:   z.string().trim().min(3).max(300).optional(),
  quote_items:    z.array(quoteItemSchema).min(1).max(40).optional(),
})

const resend = new Resend(process.env.RESEND_API_KEY)

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  // Auth admin via cookie httpOnly (identique aux autres routes /api/admin/*)
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

  const { deposit_amount } = parsed.data

  const { data: orderRaw, error: fetchError } = await supabaseAdmin
    .from('custom_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (fetchError || !orderRaw) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  const order = orderRaw as CustomOrder

  // Un devis sans lignes reste possible (ancien parcours, envoi express) : on
  // en fabrique une, pour que le PDF joint existe dans tous les cas.
  const items = parsed.data.quote_items ?? fallbackQuoteItems(order, parsed.data.total_amount ?? deposit_amount * 2)
  const object = parsed.data.quote_object ?? fallbackQuoteObject(order)
  const total = quoteTotal(items)

  if (deposit_amount > total) {
    return NextResponse.json(
      { error: `L'acompte (${euros(deposit_amount)}) dépasse le total du devis (${euros(total)}).` },
      { status: 422 },
    )
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const issuedAt = new Date()

  // Numéro de devis : conservé s'il en a déjà un (renvoi du même devis), sinon
  // alloué maintenant. La séquence ne se troue donc pas sur un devis abandonné.
  let quoteNumber = order.quote_number
  let updateError: { code?: string; message?: string } | null = null

  // Création du Stripe Checkout Session pour l'acompte
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    locale: 'fr',
    customer_email: order.email,
    line_items: [{
      price_data: {
        currency: 'eur',
        unit_amount: deposit_amount,
        product_data: {
          name: `Acompte — Projet sur-mesure #${orderId.slice(0, 8).toUpperCase()}`,
          description: order.project_type,
        },
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/custom/${orderId}?payment=success`,
    cancel_url:  `${appUrl}/custom/${orderId}`,
    metadata: { custom_order_id: orderId, type: 'custom_deposit' },
  })

  // Mise à jour de la commande en base — jusqu'à 3 essais, le temps de passer
  // un numéro déjà pris par un envoi concurrent.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!quoteNumber) quoteNumber = await nextQuoteNumber(issuedAt.getFullYear())

    const { error } = await supabaseAdmin
      .from('custom_orders')
      .update({
        status:                     'quote_sent',
        deposit_amount,
        total_amount:               total,
        payment_url:                session.url,
        stripe_checkout_session_id: session.id,
        quote_number:               quoteNumber,
        quote_object:               object,
        quote_items:                items,
        quote_issued_at:            (order.quote_issued_at ? new Date(order.quote_issued_at) : issuedAt).toISOString(),
        updated_at:                 issuedAt.toISOString(),
      })
      .eq('id', orderId)

    updateError = error
    if (!error) break
    if (!isQuoteNumberConflict(error)) break
    quoteNumber = null // numéro grillé entre-temps : on reprend au suivant
  }

  if (updateError) {
    console.error('[custom/quote] Erreur Supabase:', updateError)
    return NextResponse.json({ error: 'Devis non enregistré — réessayez.' }, { status: 500 })
  }

  const pdf = await buildQuotePdf({
    order,
    quoteNumber: quoteNumber!,
    object,
    items,
    issuedAt: order.quote_issued_at ? new Date(order.quote_issued_at) : issuedAt,
    depositAmount: deposit_amount,
  })

  // Email au client : devis en pièce jointe + lien de paiement
  const from = process.env.RESEND_FROM_EMAIL!
  const { error: emailError } = await resend.emails.send({
    from,
    replyTo: 'contact@3beestudio.fr',
    to: order.email,
    subject: `💛 Votre devis sur-mesure ${quoteNumber} — 3BeeStudio`,
    attachments: [{
      filename: quoteFileName(quoteNumber!, order.name),
      content: Buffer.from(pdf).toString('base64'),
    }],
    html: `
      <p>Bonjour ${order.name},</p>
      <p>Votre devis <strong>${quoteNumber}</strong> est prêt — vous le trouverez en pièce jointe de cet email.</p>
      <p>Pour valider votre commande, réglez l'acompte en cliquant sur le lien ci-dessous :</p>
      <p><a href="${session.url}" style="background:#F59E0B;color:#1A1300;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block">Régler mon acompte →</a></p>
      <p style="color:#888;font-size:12px">Montant de l'acompte : ${euros(deposit_amount)}<br/>Total du devis : ${euros(total)}</p>
      <p>Une fois l'acompte réglé, nous lançons immédiatement la production.</p>
      <p>Suivi de votre projet : <a href="${appUrl}/custom/${orderId}">${appUrl}/custom/${orderId}</a></p>
      <p>— L'équipe 3BeeStudio</p>
    `,
  })

  if (emailError) {
    console.error('[custom/quote] ERREUR envoi:', JSON.stringify(emailError))
    return NextResponse.json(
      { error: 'Devis enregistré, mais l\'email n\'est pas parti — transmettez le lien au client.', payment_url: session.url },
      { status: 502 },
    )
  }

  console.info('[custom/quote]', JSON.stringify({ orderId, quoteNumber, total, deposit_amount }))

  return NextResponse.json({
    session_id: session.id,
    payment_url: session.url,
    quote_number: quoteNumber,
    total_amount: total,
  })
}
