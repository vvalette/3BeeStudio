import { Text, Link } from 'react-email'
import { EmailLayout, Hero, Card, Button, Note } from './components'
import { color, font } from './theme'

/**
 * Email « votre commande est expédiée », partagé par les flux boutique et NFC.
 * Les deux tables n'ont pas la même forme (ShopOrder a des items, Order a une
 * quantité de porte-clés) → on ne prend que les champs communs au montage.
 *
 * `deliveryMode` porte le mode boutique ; le flux NFC est toujours en 'delivery'.
 */
export interface ShipmentNotificationProps {
  recipientName: string
  orderRef: string
  trackingUrl: string          // page de suivi 3BeeStudio
  carrierTrackingNumber: string | null
  carrierTrackingUrl: string | null
  deliveryMode: 'delivery' | 'pickup' | 'relay'
  relay?: {
    name: string | null
    street: string | null
    postalCode: string | null
    city: string | null
  }
  address?: {
    name: string | null
    line1: string | null
    line2: string | null
    postalCode: string | null
    city: string | null
  }
  locale?: string
}

export default function ShipmentNotification({
  recipientName,
  orderRef,
  trackingUrl,
  carrierTrackingNumber,
  carrierTrackingUrl,
  deliveryMode,
  relay,
  address,
  locale = 'fr',
}: ShipmentNotificationProps) {
  const isEn = locale === 'en'
  const isRelay = deliveryMode === 'relay'

  const t = {
    preview:  isEn ? `Order #${orderRef} shipped — 3BeeStudio` : `Commande #${orderRef} expédiée — 3BeeStudio`,
    tagline:  isEn ? 'Shipping' : 'Expédition',
    eyebrow:  isEn ? 'On its way' : 'En route',
    title:    isEn ? 'Your order has shipped.' : 'Votre commande est expédiée.',
    intro:    isEn
      ? `Good news ${recipientName} — your parcel has left our studio.`
      : `Bonne nouvelle ${recipientName} — votre colis a quitté nos studios.`,
    tracking: isEn ? 'Tracking number' : 'Numéro de suivi',
    trackingHint: isEn
      ? 'It can take up to 24 h for the carrier to show the first scan.'
      : 'Le transporteur peut mettre jusqu’à 24 h avant d’afficher le premier scan.',
    carrierBtn: isEn ? 'Track with the carrier →' : 'Suivre chez le transporteur →',
    relayTitle: isEn ? 'Delivered to your pickup point' : 'Livraison en point relais',
    relayHint:  isEn
      ? 'You will be notified when your parcel arrives. Collect it within 10 days with photo ID.'
      : 'Vous serez prévenu dès l’arrivée du colis. Retrait sous 10 jours avec une pièce d’identité.',
    deliveryTitle: isEn ? 'Delivery address' : 'Adresse de livraison',
    cta:      isEn ? 'View my order →' : 'Voir ma commande →',
    refLabel: isEn ? 'Order reference' : 'Référence commande',
  }

  return (
    <EmailLayout preview={t.preview} tagline={t.tagline} locale={isEn ? 'en' : 'fr'}>
      <Hero eyebrow={t.eyebrow} title={t.title} lead={t.intro} />

      {carrierTrackingNumber && (
        <Card title={t.tracking}>
          <Text style={{ color: color.ink0, fontSize: 18, fontWeight: 700, fontFamily: font.mono, letterSpacing: '0.04em', margin: 0 }}>
            {carrierTrackingNumber}
          </Text>
          {carrierTrackingUrl && (
            <Text style={{ margin: '10px 0 0' }}>
              <Link href={carrierTrackingUrl} style={{ color: color.amberDeep, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                {t.carrierBtn}
              </Link>
            </Text>
          )}
          <Text style={{ color: color.ink2, fontSize: 12, lineHeight: '1.55', margin: '10px 0 0' }}>
            {t.trackingHint}
          </Text>
        </Card>
      )}

      {isRelay && relay?.name ? (
        <Card title={t.relayTitle}>
          <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
            <strong style={{ color: color.ink0 }}>{relay.name}</strong><br />
            {relay.street}<br />
            {relay.postalCode} {relay.city}
          </Text>
          <Text style={{ color: color.ink2, fontSize: 12, margin: '8px 0 0' }}>{t.relayHint}</Text>
        </Card>
      ) : address?.line1 ? (
        <Card title={t.deliveryTitle}>
          <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
            {address.name}<br />
            {address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />
            {address.postalCode} {address.city}
          </Text>
        </Card>
      ) : null}

      <Button href={trackingUrl}>{t.cta}</Button>

      <Note>
        {t.refLabel} : <strong style={{ color: color.ink0, fontFamily: font.mono }}>#{orderRef}</strong>
      </Note>
    </EmailLayout>
  )
}
