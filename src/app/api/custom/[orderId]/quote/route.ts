/**
 * POST /api/custom/[orderId]/quote
 * Appelé par l'admin pour envoyer le devis au client : PDF en pièce jointe,
 * lien de paiement Stripe pour l'acompte, et bascule en `quote_sent`.
 *
 * Deux origines possibles pour le PDF joint : les lignes composées dans l'admin
 * (le document est alors fabriqué ici), ou un devis **importé** téléversé au
 * préalable (`use_imported_pdf`), qui part tel quel. Dans ce second cas les
 * lignes n'existent pas : c'est `total_amount` qui porte le montant du devis.
 *
 * Le paiement, lui, n'est pas toujours en ligne : en mode `transfer`, aucun
 * Checkout n'est créé et l'email part sans bouton de paiement.
 * Protégé par le même mot de passe admin que le reste de l'admin panel.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { isAuthenticated } from '@/lib/auth'
import { Resend } from 'resend'
import { buildQuotePdf, quoteFileName, quoteTotal, QUOTE_VALIDITY_DAYS } from '@/lib/documents/pdf'
import { render } from 'react-email'
import CustomQuote from '@/emails/CustomQuote'
import { nextQuoteNumber, isQuoteNumberConflict } from '@/lib/documents/number'
import { fallbackQuoteItems, fallbackQuoteObject, quoteItemSchema } from '@/lib/documents/input'
import { downloadQuotePdf } from '@/lib/documents/quote-file'
import type { CustomOrder } from '@/types/custom-order'

const schema = z.object({
  deposit_amount: z.number().int().positive(), // en centimes
  /**
   * Total du devis. Ignoré si des lignes sont fournies : c'est leur somme qui
   * fait foi, pour qu'un PDF ne puisse jamais afficher un total différent de
   * celui encaissé. Obligatoire, en revanche, pour un devis importé : le
   * montant n'est alors lisible que sur le PDF.
   */
  total_amount:   z.number().int().positive().optional(),
  quote_object:   z.string().trim().min(3).max(300).optional(),
  quote_items:    z.array(quoteItemSchema).min(1).max(40).optional(),
  /** Joindre le PDF importé plutôt que d'en fabriquer un depuis les lignes. */
  use_imported_pdf: z.boolean().optional(),
  /** Numéro porté par le PDF importé. Vide : numérotation maison (DEV-AAAA-NNN). */
  quote_number:   z.string().trim().min(3).max(40).optional(),
  /**
   * Comment le client règle l'acompte. `transfer` n'ouvre aucun lien Stripe :
   * l'email annonce le montant, le règlement arrive par virement et l'admin le
   * déclare depuis la fiche quand il le voit sur son compte.
   */
  payment_mode:   z.enum(['stripe', 'transfer']).default('stripe'),
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

  const imported = parsed.data.use_imported_pdf === true
  const transfer = parsed.data.payment_mode === 'transfer'

  if (imported && !order.quote_pdf_path) {
    return NextResponse.json(
      { error: 'Aucun devis PDF importé pour cette demande : téléversez-le d\'abord.' },
      { status: 422 },
    )
  }

  // Devis importé : les lignes n'ont pas été saisies, le PDF fait foi et le
  // total est déclaré à la main. Sinon, un devis sans lignes reste possible
  // (ancien parcours, envoi express) et on en fabrique une, pour que le PDF
  // joint existe dans tous les cas.
  const items = imported
    ? null
    : parsed.data.quote_items ?? fallbackQuoteItems(order, parsed.data.total_amount ?? deposit_amount * 2)
  const object = parsed.data.quote_object ?? fallbackQuoteObject(order)
  const total = items ? quoteTotal(items) : parsed.data.total_amount ?? 0

  if (imported && !total) {
    return NextResponse.json(
      { error: 'Renseignez le total du devis : il ne se déduit pas d\'un PDF importé.' },
      { status: 422 },
    )
  }

  if (deposit_amount > total) {
    return NextResponse.json(
      { error: `L'acompte (${euros(deposit_amount)}) dépasse le total du devis (${euros(total)}).` },
      { status: 422 },
    )
  }

  // Le fichier est lu avant toute écriture : un devis importé illisible doit
  // faire échouer l'envoi, pas laisser une demande en `quote_sent` sans PDF.
  let importedPdf: Buffer | null = null
  if (imported) {
    try {
      importedPdf = await downloadQuotePdf(order.quote_pdf_path!)
    } catch (err) {
      console.error('[custom/quote] devis importé illisible:', err)
      return NextResponse.json(
        { error: 'Devis importé introuvable dans le stockage : téléversez-le à nouveau.' },
        { status: 502 },
      )
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const issuedAt = new Date()

  // Numéro de devis : celui saisi par l'admin s'il y en a un (le PDF importé
  // porte souvent sa propre référence), sinon celui déjà attribué (renvoi du
  // même devis), sinon alloué maintenant. La séquence ne se troue donc pas sur
  // un devis abandonné.
  const manualNumber = parsed.data.quote_number ?? null
  let quoteNumber = manualNumber ?? order.quote_number
  let updateError: { code?: string; message?: string } | null = null

  // Checkout Stripe pour l'acompte. Rien à créer si le client règle par
  // virement : un lien de paiement laissé ouvert finirait par être cliqué, et
  // l'acompte serait encaissé deux fois.
  const session = transfer ? null : await stripe.checkout.sessions.create({
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
        payment_url:                session?.url ?? null,
        stripe_checkout_session_id: session?.id ?? null,
        quote_number:               quoteNumber,
        quote_object:               object,
        quote_items:                items, // null sur un devis importé : rien n'a été saisi
        quote_issued_at:            (order.quote_issued_at ? new Date(order.quote_issued_at) : issuedAt).toISOString(),
        updated_at:                 issuedAt.toISOString(),
      })
      .eq('id', orderId)

    updateError = error
    if (!error) break
    if (!isQuoteNumberConflict(error)) break
    // Numéro saisi à la main : le corriger en douce ferait diverger l'email du
    // PDF joint. On rend la main à l'admin.
    if (manualNumber && quoteNumber === manualNumber) {
      return NextResponse.json(
        { error: `Le numéro ${manualNumber} est déjà utilisé par un autre devis.` },
        { status: 409 },
      )
    }
    quoteNumber = null // numéro grillé entre-temps : on reprend au suivant
  }

  if (updateError) {
    console.error('[custom/quote] Erreur Supabase:', updateError)
    return NextResponse.json({ error: 'Devis non enregistré — réessayez.' }, { status: 500 })
  }

  const pdf = importedPdf ?? await buildQuotePdf({
    order,
    quoteNumber: quoteNumber!,
    object,
    items: items!,
    issuedAt: order.quote_issued_at ? new Date(order.quote_issued_at) : issuedAt,
    depositAmount: deposit_amount,
  })

  const attachmentName = importedPdf
    ? order.quote_pdf_name ?? `Devis_${quoteNumber}.pdf`
    : quoteFileName(quoteNumber!, order.name)

  // Email au client : devis en pièce jointe + lien de paiement
  const from = process.env.RESEND_FROM_EMAIL!
  const html = await render(CustomQuote({
    order,
    quoteNumber: quoteNumber!,
    object,
    // Devis importé : le détail est dans la pièce jointe, l'email n'affiche que
    // le total plutôt que d'inventer des lignes.
    items: items ?? [],
    total,
    deposit: deposit_amount,
    validUntil: new Date(issuedAt.getTime() + QUOTE_VALIDITY_DAYS * 24 * 3600 * 1000),
    appUrl,
    paymentUrl: session?.url ?? null,
  }))

  const { error: emailError } = await resend.emails.send({
    from,
    replyTo: 'contact@3beestudio.fr',
    to: order.email,
    subject: `Votre devis ${quoteNumber} — 3BeeStudio`,
    attachments: [{
      filename: attachmentName,
      content: Buffer.from(pdf).toString('base64'),
    }],
    html,
  })

  if (emailError) {
    console.error('[custom/quote] ERREUR envoi:', JSON.stringify(emailError))
    return NextResponse.json(
      {
        error: transfer
          ? 'Devis enregistré, mais l\'email n\'est pas parti — transmettez-le au client vous-même.'
          : 'Devis enregistré, mais l\'email n\'est pas parti — transmettez le lien au client.',
        payment_url: session?.url ?? null,
      },
      { status: 502 },
    )
  }

  console.info('[custom/quote]', JSON.stringify({ orderId, quoteNumber, total, deposit_amount, payment_mode: parsed.data.payment_mode }))

  return NextResponse.json({
    session_id: session?.id ?? null,
    payment_url: session?.url ?? null,
    quote_number: quoteNumber,
    total_amount: total,
  })
}
