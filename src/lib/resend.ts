import { Resend } from 'resend'
import { render } from 'react-email'
import OrderConfirmation from '@/emails/OrderConfirmation'
import CustomOrderConfirmation from '@/emails/CustomOrderConfirmation'
import CustomOrderAdmin from '@/emails/CustomOrderAdmin'
import NewsletterWelcome from '@/emails/NewsletterWelcome'
import ShopOrderConfirmation from '@/emails/ShopOrderConfirmation'
import ContactMessage from '@/emails/ContactMessage'
import { formatDestination } from '@/types/order'
import type { Order } from '@/types/order'
import type { CustomOrder } from '@/types/custom-order'
import type { ShopOrder } from '@/types/shop-order'

const resend = new Resend(process.env.RESEND_API_KEY)

function getFrom() {
  const from = process.env.RESEND_FROM_EMAIL
  if (!from) throw new Error('RESEND_FROM_EMAIL non défini dans les variables d\'environnement')
  return from
}

export async function sendOrderConfirmation(order: Order): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const from = getFrom()

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

  console.info('[resend]', JSON.stringify({ type: 'order_confirmation', orderId: order.id, resendId: data?.id }))
}

export async function sendCustomOrderConfirmation(order: CustomOrder): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const from = getFrom()

  const html = await render(CustomOrderConfirmation({ order, appUrl }))

  const { data, error } = await resend.emails.send({
    from,
    replyTo: 'contact@3beestudio.fr',
    to: order.email,
    subject: `📋 Demande sur-mesure reçue ${order.id.slice(0, 8).toUpperCase()} — 3BeeStudio`,
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'custom_order_confirmation', orderId: order.id, resendId: data?.id }))
}

export async function sendCustomOrderAdminNotification(order: CustomOrder): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const from = getFrom()

  const html = await render(CustomOrderAdmin({ order, appUrl }))

  const { data, error } = await resend.emails.send({
    from,
    replyTo: order.email,
    to: 'contact@3beestudio.fr',
    subject: `🔔 Nouvelle demande sur-mesure #${order.id.slice(0, 8).toUpperCase()} — ${order.name}`,
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'custom_order_admin_notification', orderId: order.id, resendId: data?.id }))
}

// Cache en mémoire pour éviter un appel API à chaque inscription
let _audienceId: string | null | undefined = undefined

async function getAudienceId(): Promise<string | null> {
  if (_audienceId !== undefined) return _audienceId

  // Une seule audience générique côté Resend → on prend la première du compte.
  const { data, error } = await resend.audiences.list()
  if (error || !data?.data?.length) {
    console.warn('[resend] Aucune audience trouvée — contacts non ajoutés')
    _audienceId = null
    return null
  }

  _audienceId = data.data[0].id
  console.info('[resend]', JSON.stringify({ type: 'audience_discovered', audienceId: _audienceId }))
  return _audienceId
}

export async function addToNewsletterAudience(email: string): Promise<void> {
  const audienceId = await getAudienceId()
  if (!audienceId) return

  const { error } = await resend.contacts.create({
    audienceId,
    email,
    unsubscribed: false,
  })

  if (error) {
    // Non-bloquant : l'inscription Supabase a déjà réussi
    console.warn('[resend] Ajout contact audience échoué:', error.message)
  }
}

export async function sendShopOrderConfirmation(order: ShopOrder): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const from   = getFrom()
  const locale = order.locale ?? 'fr'
  const isEn   = locale === 'en'
  const ref    = order.id.slice(0, 8).toUpperCase()

  const html = await render(ShopOrderConfirmation({ order, appUrl, locale }))

  const subject = isEn
    ? `✅ Shop order #${ref} confirmed — 3BeeStudio`
    : `✅ Commande boutique #${ref} confirmée — 3BeeStudio`

  const { data, error } = await resend.emails.send({
    from,
    replyTo: 'contact@3beestudio.fr',
    to: order.email,
    subject,
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'shop_order_confirmation', orderId: order.id, resendId: data?.id }))
}

export async function sendContactMessage(input: {
  name: string
  email: string
  subject: string
  message: string
}): Promise<void> {
  const from = getFrom()

  const html = await render(ContactMessage(input))

  const { data, error } = await resend.emails.send({
    from,
    replyTo: input.email, // répondre au mail = répondre directement au client
    to: 'contact@3beestudio.fr',
    subject: `✉️ Contact — ${input.subject}`,
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'contact_message', resendId: data?.id }))
}

export async function sendNewsletterWelcome(email: string, locale = 'fr'): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const from   = getFrom()
  const isEn   = locale === 'en'

  const html = await render(NewsletterWelcome({ appUrl, locale }))

  const subject = isEn
    ? '🐝 Welcome to the hive — your first look awaits'
    : '🐝 Bienvenue dans la ruche — votre avant-première vous attend'

  const { data, error } = await resend.emails.send({
    from,
    replyTo: 'contact@3beestudio.fr',
    to: email,
    subject,
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'newsletter_welcome', resendId: data?.id }))
}
