import { Text, Link, Section } from 'react-email'
import { EmailLayout, Hero, Card, Button, TotalRow } from './components'
import { color, font, style } from './theme'
import type { ShopOrderItem } from '@/types/shop-order'

interface Props {
  /** Prénom ou nom complet du client, tel qu'il l'a saisi au checkout. */
  name:  string | null
  items: ShopOrderItem[]
  subtotal: number
  /** Lien de reprise du panier (`/boutique/commande?panier=…`). */
  recoveryUrl: string
  /** Lien de désinscription des relances. */
  optOutUrl: string
  locale?: string
}

/**
 * Relance d'un panier laissé au moment de payer.
 *
 * Un seul envoi par panier, entre 1 h et 48 h après l'abandon : au-delà ce n'est
 * plus un rappel mais de la prospection. D'où aussi le lien de désinscription en
 * pied de page, qui remplace le pied par défaut.
 */
export default function AbandonedCart({
  name,
  items,
  subtotal,
  recoveryUrl,
  optOutUrl,
  locale = 'fr',
}: Props) {
  const isEn = locale === 'en'
  const firstName = (name ?? '').trim().split(' ')[0]

  const fmt = (cents: number) =>
    new Intl.NumberFormat(isEn ? 'en-GB' : 'fr-FR', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
    }).format(cents / 100)

  const t = {
    preview: isEn
      ? 'Your cart is still waiting — 3BeeStudio'
      : 'Votre panier vous attend · 3BeeStudio',
    tagline: isEn ? 'Shop' : 'Boutique',
    eyebrow: isEn ? 'Cart saved' : 'Panier conservé',
    title:   isEn ? 'You left something behind.' : 'Vous avez laissé quelque chose.',
    lead: isEn
      ? `${firstName ? `${firstName}, y` : 'Y'}our cart is still here — we saved it so you can pick up right where you stopped. Nothing has been charged.`
      : `${firstName ? `${firstName}, votre` : 'Votre'} panier est toujours là : nous l'avons gardé pour que vous puissiez reprendre où vous en étiez. Rien n'a été débité.`,
    summary:  isEn ? 'Your cart' : 'Votre panier',
    qty:      isEn ? 'Qty' : 'Qté',
    color:    isEn ? 'Colour' : 'Coloris',
    subtotal: isEn ? 'Subtotal' : 'Sous-total',
    cta:      isEn ? 'Complete my order →' : 'Finaliser ma commande →',
    stockNote: isEn
      ? 'Items are printed in small batches: prices and availability are refreshed when you open the link.'
      : 'Les pièces sont imprimées en petite série : les prix et la disponibilité sont réactualisés à l\'ouverture du lien.',
    help: isEn
      ? 'A question about an item? Just reply to this email.'
      : 'Une question sur un article ? Répondez simplement à cet email.',
    optOut: isEn ? 'Stop these reminders' : 'Ne plus recevoir ces rappels',
  }

  return (
    <EmailLayout
      preview={t.preview}
      tagline={t.tagline}
      locale={isEn ? 'en' : 'fr'}
      footer={
        <Section style={style.footer}>
          <Text style={{ color: color.ink2, fontSize: 12, margin: '0 0 6px' }}>{t.help}</Text>
          <Link href="mailto:contact@3beestudio.fr" style={{ ...style.link, fontSize: 13 }}>
            contact@3beestudio.fr
          </Link>
          {/* Une relance n'est pas un email transactionnel : le lien de retrait
              doit être visible, pas caché en bas en corps 8. */}
          <Text style={{ margin: '16px 0 0' }}>
            <Link href={optOutUrl} style={{ color: color.ink3, fontSize: 12, textDecoration: 'underline' }}>
              {t.optOut}
            </Link>
          </Text>
          <Text style={{ color: color.ink3, fontSize: 11, margin: '14px 0 0', fontFamily: font.mono }}>
            3BeeStudio · {isEn ? '3D printing studio' : 'Studio d’impression 3D'} · France
          </Text>
        </Section>
      }
    >
      <Hero eyebrow={t.eyebrow} title={t.title} lead={t.lead} />

      <Card title={t.summary}>
        <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td style={{ paddingBottom: 12, paddingRight: 12, verticalAlign: 'top' }}>
                  <Text style={{ color: color.ink0, fontSize: 13, fontWeight: 700, margin: 0 }}>
                    {item.product_name}
                  </Text>
                  {item.color && (
                    <Text style={{ color: color.ink2, fontSize: 12, margin: '3px 0 0' }}>
                      {t.color} : {item.color.label}
                    </Text>
                  )}
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
            <TotalRow label={t.subtotal} value={fmt(subtotal)} strong />
          </tbody>
        </table>
      </Card>

      <Button href={recoveryUrl}>{t.cta}</Button>

      <Text style={{ color: color.ink3, fontSize: 12, lineHeight: '1.6', margin: '0 0 20px', textAlign: 'center' }}>
        {t.stockNote}
      </Text>
    </EmailLayout>
  )
}
