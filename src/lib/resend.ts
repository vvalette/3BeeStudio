import { Resend } from 'resend'
import { render } from 'react-email'
import OrderConfirmation from '@/emails/OrderConfirmation'
import CustomOrderConfirmation from '@/emails/CustomOrderConfirmation'
import CustomOrderAdmin from '@/emails/CustomOrderAdmin'
import NewsletterWelcome from '@/emails/NewsletterWelcome'
import ShopOrderConfirmation from '@/emails/ShopOrderConfirmation'
import ShopOrderAdmin from '@/emails/ShopOrderAdmin'
import NfcOrderAdmin from '@/emails/NfcOrderAdmin'
import ContactMessage from '@/emails/ContactMessage'
import ShipmentNotification from '@/emails/ShipmentNotification'
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

/**
 * Destinataire(s) des notifications internes (nouvelle commande, message contact).
 * `ADMIN_EMAIL` accepte plusieurs adresses séparées par des virgules — utile pour
 * recevoir aussi sur une boîte perso en plus de contact@3beestudio.fr.
 */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAIL ?? 'contact@3beestudio.fr'
  return raw.split(',').map((e) => e.trim()).filter(Boolean)
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
    to: getAdminEmails(),
    subject: `🔔 Nouvelle demande sur-mesure #${order.id.slice(0, 8).toUpperCase()} — ${order.name}`,
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'custom_order_admin_notification', orderId: order.id, resendId: data?.id }))
}

/**
 * Notification interne « nouvelle commande NFC payée ».
 * Envoyée depuis les mêmes points que la confirmation client (webhook Stripe +
 * fallback sync de la page suivi), donc protégée par la même idempotence :
 * un seul appel gagne la transition pending_payment → confirmed.
 */
export async function sendOrderAdminNotification(order: Order): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const from = getFrom()

  const html = await render(NfcOrderAdmin({ order, appUrl }))

  const { data, error } = await resend.emails.send({
    from,
    replyTo: order.email, // répondre au mail = répondre directement au client
    to: getAdminEmails(),
    subject: `💰 Nouvelle commande NFC #${order.id.slice(0, 8).toUpperCase()} — ${order.company} (${order.quantity} pcs)`,
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'nfc_order_admin_notification', orderId: order.id, resendId: data?.id }))
}

/**
 * Emails d'une commande NFC qui vient de passer en `confirmed` : confirmation
 * client + notification interne. Point d'entrée unique pour les 3 chemins de
 * confirmation (webhook checkout.session.completed, payment_intent.succeeded,
 * fallback sync de la page suivi) — sans ça, un chemin oublié = pas de mail.
 *
 * Jamais bloquant : un échec Resend ne doit pas faire répondre 500 au webhook
 * (Stripe retenterait alors que la commande est déjà confirmée en base).
 */
export async function sendNfcOrderEmails(order: Order): Promise<void> {
  await Promise.all([
    sendOrderConfirmation(order).catch((err) =>
      console.error('[resend] Email client non bloquant:', err),
    ),
    sendOrderAdminNotification(order).catch((err) =>
      console.error('[resend] Notif admin non bloquante:', err),
    ),
  ])
}

/** Notification interne « nouvelle commande boutique payée ». */
export async function sendShopOrderAdminNotification(order: ShopOrder): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const from = getFrom()

  const html = await render(ShopOrderAdmin({ order, appUrl }))

  const mode = order.delivery_mode === 'pickup' ? 'retrait studio' : 'livraison'

  const { data, error } = await resend.emails.send({
    from,
    replyTo: order.email,
    to: getAdminEmails(),
    subject: `🛒 Nouvelle commande boutique #${order.id.slice(0, 8).toUpperCase()} — ${order.name} (${mode})`,
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'shop_order_admin_notification', orderId: order.id, resendId: data?.id }))
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

/**
 * « Votre commande est expédiée » — boutique.
 *
 * L'appelant est responsable de l'idempotence : ces mails partent uniquement sur
 * la transition `confirmed|processing → shipped`, jamais sur un simple refresh du
 * suivi Boxtal (le webhook TRACKING_CHANGED peut rejouer plusieurs fois).
 */
export async function sendShopShipmentNotification(order: ShopOrder): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const from   = getFrom()
  const locale = order.locale ?? 'fr'
  const isEn   = locale === 'en'
  const ref    = order.id.slice(0, 8).toUpperCase()

  const html = await render(ShipmentNotification({
    recipientName: order.name,
    orderRef: ref,
    trackingUrl: `${appUrl}${isEn ? '/en' : ''}/boutique/suivi/${order.id}`,
    carrierTrackingNumber: order.tracking_number,
    carrierTrackingUrl: order.tracking_url,
    deliveryMode: order.delivery_mode,
    relay: {
      name:       order.pickup_point_name,
      street:     order.pickup_point_street,
      postalCode: order.pickup_point_postal_code,
      city:       order.pickup_point_city,
    },
    address: {
      name:       order.shipping_name,
      line1:      order.shipping_address,
      line2:      order.shipping_address2,
      postalCode: order.shipping_postal_code,
      city:       order.shipping_city,
    },
    locale,
  }))

  const { data, error } = await resend.emails.send({
    from,
    replyTo: 'contact@3beestudio.fr',
    to: order.email,
    subject: isEn
      ? `📦 Order #${ref} shipped — 3BeeStudio`
      : `📦 Commande #${ref} expédiée — 3BeeStudio`,
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'shop_shipment_notification', orderId: order.id, resendId: data?.id }))
}

/** « Votre commande est expédiée » — porte-clés NFC (flux B2B, toujours en FR). */
export async function sendNfcShipmentNotification(order: Order): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const from   = getFrom()
  const ref    = order.id.slice(0, 8).toUpperCase()

  const html = await render(ShipmentNotification({
    recipientName: order.company,
    orderRef: ref,
    trackingUrl: `${appUrl}/suivi/${order.id}`,
    carrierTrackingNumber: order.tracking_number,
    carrierTrackingUrl: order.tracking_url,
    deliveryMode: 'delivery',
    address: {
      name:       order.shipping_name,
      line1:      order.shipping_address,
      line2:      order.shipping_address2,
      postalCode: order.shipping_postal_code,
      city:       order.shipping_city,
    },
  }))

  const { data, error } = await resend.emails.send({
    from,
    replyTo: 'contact@3beestudio.fr',
    to: order.email,
    subject: `📦 Commande #${ref} expédiée — 3BeeStudio`,
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'nfc_shipment_notification', orderId: order.id, resendId: data?.id }))
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
    to: getAdminEmails(),
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
