import { Resend } from 'resend'
import { render } from 'react-email'
import OrderConfirmation from '@/emails/OrderConfirmation'
import CustomOrderConfirmation from '@/emails/CustomOrderConfirmation'
import CustomOrderAdmin from '@/emails/CustomOrderAdmin'
import NewsletterWelcome from '@/emails/NewsletterWelcome'
import ShopOrderConfirmation from '@/emails/ShopOrderConfirmation'
import AbandonedCart from '@/emails/AbandonedCart'
import ShopOrderAdmin from '@/emails/ShopOrderAdmin'
import NfcOrderAdmin from '@/emails/NfcOrderAdmin'
import ContactMessage from '@/emails/ContactMessage'
import ShipmentNotification from '@/emails/ShipmentNotification'
import OrderDelivered from '@/emails/OrderDelivered'
import { listDownloads } from '@/lib/digital-delivery'
import { ensureInvoice, renderInvoicePdf, type InvoiceSource } from '@/lib/documents/invoice'
import { invoiceFileName } from '@/lib/documents/pdf'
import type { Order as NfcOrder } from '@/types/order'
import { formatDestination } from '@/types/order'
import type { Order } from '@/types/order'
import type { CustomOrder } from '@/types/custom-order'
import type { ShopOrder } from '@/types/shop-order'
import type { AbandonedCart as AbandonedCartRow } from '@/types/abandoned-cart'
import { recoveryUrl, optOutUrl } from '@/lib/abandoned-cart'

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
    subject: `✅ Commande confirmée #${order.id.slice(0, 8).toUpperCase()} · 3BeeStudio`,
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
    subject: `📋 Demande sur-mesure reçue ${order.id.slice(0, 8).toUpperCase()} · 3BeeStudio`,
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
    subject: `🔔 Nouvelle demande sur-mesure #${order.id.slice(0, 8).toUpperCase()} · ${order.name}`,
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
    subject: `💰 Nouvelle commande NFC #${order.id.slice(0, 8).toUpperCase()} · ${order.company} (${order.quantity} pcs)`,
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

  const ref = order.id.slice(0, 8).toUpperCase()

  // Une vente de fichiers ne demande aucun travail : l'objet doit le dire dès la
  // boîte de réception, sinon elle se lit comme une commande à préparer.
  const subject = order.delivery_mode === 'digital'
    ? `⬇️ Vente de fichiers #${ref} · ${order.name} (rien à faire)`
    : `🛒 Nouvelle commande boutique #${ref} · ${order.name} (${
        order.delivery_mode === 'pickup' ? 'retrait studio' : 'livraison'
      })`

  const { data, error } = await resend.emails.send({
    from,
    replyTo: order.email,
    to: getAdminEmails(),
    subject,
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

  // Fichiers achetés : listés dans l'email, mais le lien renvoie vers la page de
  // suivi. Mettre une URL signée dans un email serait absurde — elle expire en
  // 2 minutes, l'email se garde des mois.
  const downloads = order.has_digital
    ? (await listDownloads(order.id)).map((d) => ({ id: d.id, file_name: d.file_name }))
    : []

  const html = await render(ShopOrderConfirmation({ order, appUrl, locale, downloads }))

  const subject = order.has_digital && !order.has_physical
    ? (isEn ? `⬇️ Your files are ready #${ref} — 3BeeStudio` : `⬇️ Vos fichiers sont prêts #${ref} · 3BeeStudio`)
    : isEn
      ? `✅ Shop order #${ref} confirmed — 3BeeStudio`
      : `✅ Commande boutique #${ref} confirmée · 3BeeStudio`

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
 * Relance d'un panier laissé au moment de payer.
 *
 * Contrairement aux autres emails d'ici, celui-ci n'est pas transactionnel : il
 * porte donc un lien de désinscription (`optOutUrl`), et le cron ne l'envoie
 * qu'une fois par panier. Lève en cas d'échec pour que le cron ne marque pas la
 * relance comme envoyée.
 */
export async function sendAbandonedCartReminder(cart: AbandonedCartRow): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const from   = getFrom()
  const locale = cart.locale ?? 'fr'
  const isEn   = locale === 'en'

  const html = await render(
    AbandonedCart({
      name:        cart.name,
      items:       cart.items,
      subtotal:    cart.subtotal,
      recoveryUrl: recoveryUrl(appUrl, cart.token, locale),
      optOutUrl:   optOutUrl(appUrl, cart.token),
      locale,
    }),
  )

  const { data, error } = await resend.emails.send({
    from,
    replyTo: 'contact@3beestudio.fr',
    to: cart.email,
    subject: isEn
      ? 'Your cart is still waiting — 3BeeStudio'
      : 'Votre panier vous attend · 3BeeStudio',
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'abandoned_cart', cartId: cart.id, resendId: data?.id }))
}

/**
 * « Votre commande est expédiée » — boutique.
 *
 * L'appelant est responsable de l'idempotence : ces mails partent uniquement sur
 * la transition `confirmed|processing → shipped`, jamais sur un simple refresh du
 * suivi Boxtal (le webhook TRACKING_CHANGED peut rejouer plusieurs fois).
 */
/**
 * Facture PDF à joindre à l'email d'expédition.
 *
 * Jamais bloquant : si la facture ne peut pas être émise (base indisponible,
 * migration non appliquée), le client doit quand même être prévenu que son
 * colis part. On log et on envoie l'email sans pièce jointe.
 */
async function invoiceAttachment(
  source: InvoiceSource,
  order: NfcOrder | ShopOrder | CustomOrder,
): Promise<Array<{ filename: string; content: string }>> {
  try {
    const invoice = await ensureInvoice(source, order)
    const pdf = await renderInvoicePdf(invoice)
    return [{
      filename: invoiceFileName(invoice.number, invoice.client_name),
      content: Buffer.from(pdf).toString('base64'),
    }]
  } catch (err) {
    console.error('[resend] facture non jointe:', err)
    return []
  }
}

export async function sendShopShipmentNotification(order: ShopOrder): Promise<void> {
  // Une commande 100 % fichiers n'a pas de colis : parler d'expédition au client
  // n'aurait aucun sens. Les appelants filtrent déjà, ceci est le garde-fou.
  if (order.delivery_mode === 'digital') {
    console.warn('[resend] email expédition ignoré — commande numérique', order.id)
    return
  }

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
    // 'digital' est exclu par la garde en tête de fonction.
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
      : `📦 Commande #${ref} expédiée · 3BeeStudio`,
    attachments: await invoiceAttachment('shop', order),
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
    subject: `📦 Commande #${ref} expédiée · 3BeeStudio`,
    attachments: await invoiceAttachment('nfc', order),
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'nfc_shipment_notification', orderId: order.id, resendId: data?.id }))
}

/** « Votre projet est expédié » — sur-mesure. */
export async function sendCustomShipmentNotification(order: CustomOrder): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const from   = getFrom()
  const ref    = order.id.slice(0, 8).toUpperCase()

  const html = await render(ShipmentNotification({
    recipientName: order.name,
    orderRef: ref,
    trackingUrl: `${appUrl}/custom/${order.id}`,
    carrierTrackingNumber: order.tracking_number,
    carrierTrackingUrl: order.tracking_url,
    deliveryMode: 'delivery',
    address: {
      name:       order.shipping_name,
      line1:      order.shipping_address,
      line2:      null,
      postalCode: order.shipping_postal_code,
      city:       order.shipping_city,
    },
  }))

  const { data, error } = await resend.emails.send({
    from,
    replyTo: 'contact@3beestudio.fr',
    to: order.email,
    subject: `📦 Projet sur-mesure #${ref} expédié · 3BeeStudio`,
    attachments: await invoiceAttachment('custom', order),
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'custom_shipment_notification', orderId: order.id, resendId: data?.id }))
}

/**
 * « Votre colis est arrivé » + demande d'avis Google.
 *
 * Un seul émetteur pour les trois flux : à ce stade l'email ne dépend plus que
 * du destinataire et de sa page de suivi.
 */
export async function sendDeliveredNotification(input: {
  email: string
  recipientName: string
  orderRef: string
  trackingPath: string
  what?: string
  locale?: string
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://3beestudio.fr'
  const from   = getFrom()
  const locale = input.locale ?? 'fr'
  const isEn   = locale === 'en'

  const html = await render(OrderDelivered({
    recipientName: input.recipientName,
    orderRef: input.orderRef,
    trackingUrl: `${appUrl}${isEn ? '/en' : ''}${input.trackingPath}`,
    what: input.what,
    locale,
  }))

  const { data, error } = await resend.emails.send({
    from,
    replyTo: 'contact@3beestudio.fr',
    to: input.email,
    subject: isEn
      ? `Your order #${input.orderRef} has arrived — 3BeeStudio`
      : `Votre commande #${input.orderRef} est arrivée · 3BeeStudio`,
    html,
  })

  if (error) throw new Error(`Resend error ${error.name}: ${error.message}`)
  console.info('[resend]', JSON.stringify({ type: 'delivered_notification', orderRef: input.orderRef, resendId: data?.id }))
}

/** Livraison d'une commande NFC. */
export function sendNfcDeliveredNotification(order: NfcOrder): Promise<void> {
  return sendDeliveredNotification({
    email: order.email,
    recipientName: order.company,
    orderRef: order.id.slice(0, 8).toUpperCase(),
    trackingPath: `/suivi/${order.id}`,
    what: `vos ${order.quantity} porte-clés`,
  })
}

/** Livraison d'une commande boutique. */
export function sendShopDeliveredNotification(order: ShopOrder): Promise<void> {
  return sendDeliveredNotification({
    email: order.email,
    recipientName: order.name,
    orderRef: order.id.slice(0, 8).toUpperCase(),
    trackingPath: `/boutique/suivi/${order.id}`,
    locale: order.locale ?? 'fr',
  })
}

/** Livraison d'un projet sur-mesure. */
export function sendCustomDeliveredNotification(order: CustomOrder): Promise<void> {
  return sendDeliveredNotification({
    email: order.email,
    recipientName: order.name,
    orderRef: order.id.slice(0, 8).toUpperCase(),
    trackingPath: `/custom/${order.id}`,
    what: 'votre pièce sur-mesure',
  })
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
    subject: `✉️ Contact : ${input.subject}`,
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
    : '🐝 Bienvenue dans la ruche, votre avant-première vous attend'

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
