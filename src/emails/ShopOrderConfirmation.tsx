import { Text, Link } from 'react-email'
import { EmailLayout, Hero, Card, Button, Note, TotalRow } from './components'
import { color, font } from './theme'
import type { ShopOrder } from '@/types/shop-order'

interface Props {
  order: ShopOrder
  appUrl: string
  locale?: string
  /**
   * Fichiers achetés, si la commande en contient. On n'envoie PAS de lien signé
   * ici : un email est stocké durablement, alors qu'une URL signée expire en
   * 2 minutes. Le lien pointe donc sur la page de suivi, qui régénère l'accès.
   */
  downloads?: { id: string; file_name: string }[]
}

export default function ShopOrderConfirmation({ order, appUrl, locale = 'fr', downloads = [] }: Props) {
  const isEn = locale === 'en'
  const ref  = order.id.slice(0, 8).toUpperCase()
  const trackingUrl = `${appUrl}${isEn ? '/en' : ''}/boutique/suivi/${order.id}`

  const fmt = (cents: number) =>
    new Intl.NumberFormat(isEn ? 'en-GB' : 'fr-FR', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
    }).format(cents / 100)

  const t = {
    preview:   isEn ? `Order #${ref} confirmed — 3BeeStudio` : `Commande #${ref} confirmée — 3BeeStudio`,
    tagline:   isEn ? 'Shop' : 'Boutique',
    eyebrow:   isEn ? 'Payment received' : 'Paiement reçu',
    title:     isEn ? 'Your order is confirmed.' : 'Votre commande est confirmée.',
    intro:     isEn
      ? `Thank you ${order.name} — we've received your payment. Your order is being prepared in our studio.`
      : `Merci ${order.name} — nous avons bien reçu votre paiement. Votre commande est en préparation dans nos studios.`,
    summary:   isEn ? 'Order summary' : 'Récapitulatif',
    qty:       isEn ? 'Qty' : 'Qté',
    subtotal:  isEn ? 'Subtotal' : 'Sous-total',
    discount:  isEn ? 'Newsletter discount (−10%)' : 'Réduction newsletter (−10%)',
    shipping:  isEn ? 'Shipping' : 'Livraison',
    free:      isEn ? 'Free' : 'Offerte',
    total:     isEn ? 'Total paid' : 'Total payé',
    pickup:    isEn ? 'Studio pickup' : 'Retrait en studio',
    pickupHint: isEn
      ? "We'll contact you to arrange a pickup time."
      : 'Nous vous contacterons pour convenir d’un créneau de retrait.',
    delivery:  isEn ? 'Delivery' : 'Livraison',
    relay:     isEn ? 'Pickup point' : 'Point relais',
    relayHint: isEn
      ? 'Collect within 10 days with photo ID. You will be notified when your parcel arrives.'
      : 'Retrait sous 10 jours avec une pièce d’identité. Vous serez prévenu dès l’arrivée du colis.',
    cta:       isEn ? 'Track my order →' : 'Suivre ma commande →',
    digital:      isEn ? 'Your files' : 'Vos fichiers',
    digitalIntro: isEn
      ? 'Your download is ready — open your order page to get your files.'
      : 'Votre téléchargement est prêt — ouvrez votre page de commande pour récupérer vos fichiers.',
    digitalBtn:  isEn ? 'Download my files →' : 'Télécharger mes fichiers →',
    digitalNote: isEn
      ? 'Links are valid for 30 days, 10 downloads per file. Keep this email.'
      : 'Liens valables 30 jours, 10 téléchargements par fichier. Conservez cet email.',
    refLabel: isEn ? 'Order reference' : 'Référence commande',
  }

  return (
    <EmailLayout preview={t.preview} tagline={t.tagline} locale={isEn ? 'en' : 'fr'}>
      <Hero eyebrow={t.eyebrow} title={t.title} lead={t.intro} />

      <Card title={t.summary}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i}>
                <td style={{ paddingBottom: 12, paddingRight: 12, verticalAlign: 'top' }}>
                  <Text style={{ color: color.ink0, fontSize: 13, fontWeight: 700, margin: 0 }}>{item.product_name}</Text>
                  <Text style={{ color: color.ink3, fontSize: 11, fontFamily: font.mono, margin: '3px 0 0' }}>
                    {t.qty} {item.quantity} × {fmt(item.unit_price)}
                  </Text>
                </td>
                <td style={{ paddingBottom: 12, textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                  <Text style={{ color: color.ink0, fontSize: 13, fontWeight: 700, fontFamily: font.mono, margin: 0 }}>
                    {fmt(item.unit_price * item.quantity)}
                  </Text>
                </td>
              </tr>
            ))}
            <tr>
              <td colSpan={2} style={{ borderTop: `1px solid ${color.line2}`, paddingTop: 12 }} />
            </tr>
            <TotalRow label={t.subtotal} value={fmt(order.subtotal)} />
            {(order.discount_amount ?? 0) > 0 && (
              <TotalRow label={order.promo_code ? `Code ${order.promo_code}` : t.discount} value={`− ${fmt(order.discount_amount!)}`} />
            )}
            {order.delivery_mode !== 'digital' && (
              <TotalRow label={t.shipping} value={order.shipping === 0 ? t.free : fmt(order.shipping)} />
            )}
            <TotalRow label={t.total} value={fmt(order.total_amount)} strong />
          </tbody>
        </table>
      </Card>

      {downloads.length > 0 && (
        <Card title={t.digital}>
          {downloads.map((f) => (
            <Text key={f.id} style={{ color: color.ink0, fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>
              {f.file_name}
            </Text>
          ))}
          <Text style={{ color: color.ink2, fontSize: 12, lineHeight: '1.6', margin: '10px 0 0' }}>
            {t.digitalIntro}
          </Text>
          <Text style={{ margin: '10px 0 0' }}>
            <Link href={trackingUrl} style={{ color: color.amberDeep, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              {t.digitalBtn}
            </Link>
          </Text>
          <Text style={{ color: color.ink3, fontSize: 11, lineHeight: '1.5', margin: '8px 0 0' }}>
            {t.digitalNote}
          </Text>
        </Card>
      )}

      {/* Une commande 100 % numérique n'a ni adresse ni point relais à montrer. */}
      {order.delivery_mode !== 'digital' && (
        <Card title={order.delivery_mode === 'pickup' ? t.pickup : order.delivery_mode === 'relay' ? t.relay : t.delivery}>
          {order.delivery_mode === 'pickup' ? (
            <>
              <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
                144 rue de la République<br />69220 Belleville-en-Beaujolais
              </Text>
              <Text style={{ color: color.ink2, fontSize: 12, margin: '8px 0 0' }}>{t.pickupHint}</Text>
            </>
          ) : order.delivery_mode === 'relay' ? (
            <>
              <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
                <strong style={{ color: color.ink0 }}>{order.pickup_point_name}</strong><br />
                {order.pickup_point_street}<br />
                {order.pickup_point_postal_code} {order.pickup_point_city}
              </Text>
              <Text style={{ color: color.ink2, fontSize: 12, margin: '8px 0 0' }}>{t.relayHint}</Text>
            </>
          ) : (
            <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
              {order.shipping_name}<br />
              {order.shipping_address}{order.shipping_address2 ? `, ${order.shipping_address2}` : ''}<br />
              {order.shipping_postal_code} {order.shipping_city}
            </Text>
          )}
        </Card>
      )}

      <Button href={trackingUrl}>{t.cta}</Button>

      <Note>
        {t.refLabel} : <strong style={{ color: color.ink0, fontFamily: font.mono }}>#{ref}</strong>
      </Note>
    </EmailLayout>
  )
}
