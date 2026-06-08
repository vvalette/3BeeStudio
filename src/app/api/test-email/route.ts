import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import OrderConfirmation from '@/emails/OrderConfirmation'

// Route de diagnostic — à supprimer avant la prod
// GET /api/test-email?to=votre@email.com
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const to = searchParams.get('to')

  if (!to) {
    return NextResponse.json({ error: 'Paramètre ?to=email manquant' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'

  // 1. Vérifier la clé
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY manquante' }, { status: 500 })
  }

  // 2. Render du template
  let html: string
  try {
    html = await render(
      OrderConfirmation({
        company: 'Acme Corp (test)',
        email: to,
        quantity: 25,
        destination: 'instagram.com/moncompte',
        totalAmount: 6690,
        orderId: 'test-0000-0000-0000-000000000001',
        appUrl,
      }),
    )
  } catch (err) {
    return NextResponse.json({ step: 'render', error: String(err) }, { status: 500 })
  }

  // 3. Envoi via Resend
  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: '🧪 [Test] Email 3BeeStudio',
    html,
  })

  if (error) {
    return NextResponse.json({
      step: 'send',
      from: fromEmail,
      to,
      error,
    }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    from: fromEmail,
    to,
    emailId: data?.id,
    note: fromEmail === 'onboarding@resend.dev'
      ? '⚠️ Domaine non vérifié : seul le compte Resend peut recevoir les emails. Ajoutez RESEND_FROM_EMAIL=commandes@3beestudio.fr après vérification du domaine.'
      : '✅ Envoi depuis domaine vérifié',
  })
}
