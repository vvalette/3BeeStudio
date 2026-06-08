import { Resend } from 'resend'
import { render } from '@react-email/components'
import OrderConfirmation from '@/emails/OrderConfirmation'
import { formatDestination } from '@/types/order'
import type { Order } from '@/types/order'

const resend = new Resend(process.env.RESEND_API_KEY)

function getFrom() {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) throw new Error('RESEND_FROM_EMAIL non défini dans les variables d\'environnement')
  return from
}

export async function sendOrderConfirmation(order: Order): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const from = getFrom()

  console.log('[resend] Rendu du template email…')
  const html = await render(
    OrderConfirmation({
      company: order.company,
      email: order.email,
      quantity: order.quantity,
      destination: formatDestination(order.nfc_url),
      totalAmount: order.total_amount,
      orderId: order.id,
      appUrl,
    }),
  )
  console.log('[resend] Template rendu, envoi vers', order.email, 'depuis', from)

  const { data, error } = await resend.emails.send({
    from,
    replyTo: 'contact@3beestudio.fr',
    to: order.email,
    subject: `✅ Commande confirmée #${order.id.slice(0, 8).toUpperCase()} — 3BeeStudio`,
    html,
  })

  if (error) {
    console.error('[resend] ERREUR envoi:', JSON.stringify(error))
    throw new Error(`Resend error ${error.name}: ${error.message}`)
  }

  console.log('[resend] Email envoyé — id:', data?.id, '→', order.email)
}
