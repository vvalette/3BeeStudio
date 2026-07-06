/**
 * POST /api/custom/[orderId]/quote
 * Appelé par l'admin pour créer un lien de paiement Stripe et notifier le client.
 * Protégé par le même mot de passe admin que le reste de l'admin panel.
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase'
import { stripe } from '@/lib/stripe'
import { isAuthenticated } from '@/lib/auth'
import { Resend } from 'resend'

const schema = z.object({
  deposit_amount: z.number().int().positive(), // en centimes
  total_amount:   z.number().int().positive(), // en centimes
})

const resend = new Resend(process.env.RESEND_API_KEY)

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

  const { deposit_amount, total_amount } = parsed.data

  // Récupération de la commande
  const { data: order, error: fetchError } = await supabaseAdmin
    .from('custom_orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'

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
          name: `Acompte 50% — Projet sur-mesure #${orderId.slice(0, 8).toUpperCase()}`,
          description: order.project_type,
        },
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/custom/${orderId}?payment=success`,
    cancel_url:  `${appUrl}/custom/${orderId}`,
    metadata: { custom_order_id: orderId, type: 'custom_deposit' },
  })

  // Mise à jour de la commande en base
  await supabaseAdmin
    .from('custom_orders')
    .update({
      status:                    'quote_sent',
      deposit_amount,
      total_amount,
      payment_url:               session.url,
      stripe_checkout_session_id: session.id,
    })
    .eq('id', orderId)

  // Email au client avec le lien de paiement
  const from = process.env.RESEND_FROM_EMAIL!
  await resend.emails.send({
    from,
    replyTo: 'contact@3beestudio.fr',
    to: order.email,
    subject: `💛 Votre devis sur-mesure est prêt — 3BeeStudio`,
    html: `
      <p>Bonjour ${order.name},</p>
      <p>Votre devis est prêt. Pour valider votre commande, réglez l'acompte (50%) en cliquant sur le lien ci-dessous :</p>
      <p><a href="${session.url}" style="background:#F59E0B;color:#1A1300;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block">Régler mon acompte →</a></p>
      <p style="color:#888;font-size:12px">Montant de l'acompte : ${(deposit_amount / 100).toFixed(2).replace('.', ',')} €<br/>Total estimé : ${(total_amount / 100).toFixed(2).replace('.', ',')} €</p>
      <p>Une fois l'acompte réglé, nous lançons immédiatement la production.</p>
      <p>— L'équipe 3BeeStudio</p>
    `,
  })

  return NextResponse.json({ session_id: session.id, payment_url: session.url })
}
