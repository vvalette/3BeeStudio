import { Text, Link } from 'react-email'
import { EmailLayout, Hero, Card, Button, Note } from './components'
import { color, font } from './theme'
import { GOOGLE_REVIEW_WRITE_URL } from '@/lib/links'

/**
 * « Votre colis est arrivé » — envoyé quand le transporteur confirme la
 * livraison, tous flux confondus.
 *
 * Son vrai but est la demande d'avis : c'est le seul moment où le client a
 * l'objet en main. La formulation reste une question, pas une injonction, et
 * l'email dit d'abord quoi faire si quelque chose ne va pas — demander cinq
 * étoiles à quelqu'un qui a reçu une pièce cassée, c'est le meilleur moyen
 * d'en récolter une seule.
 */

export interface OrderDeliveredProps {
  recipientName: string
  orderRef: string
  /** Page de suivi 3BeeStudio de la commande. */
  trackingUrl: string
  /** Ce qui a été livré, pour situer l'email : « vos porte-clés », « votre commande ». */
  what?: string
  locale?: string
}

export default function OrderDelivered({
  recipientName,
  orderRef,
  trackingUrl,
  what,
  locale = 'fr',
}: OrderDeliveredProps) {
  const isEn = locale === 'en'
  const subject = what ?? (isEn ? 'your order' : 'votre commande')

  const t = {
    preview: isEn
      ? `Your order #${orderRef} has been delivered — how did we do?`
      : `Votre commande #${orderRef} est arrivée — ça vous a plu ?`,
    tagline: isEn ? 'Delivered' : 'Livraison',
    eyebrow: isEn ? 'Delivered' : 'Colis livré',
    title:   isEn ? 'Your parcel has arrived.' : 'Votre colis est arrivé.',
    lead:    isEn
      ? `${recipientName}, the carrier confirms ${subject} has been delivered. We hope it lives up to what you pictured.`
      : `${recipientName}, le transporteur confirme la livraison de ${subject}. On espère que le résultat est à la hauteur de ce que vous imaginiez.`,
    reviewTitle: isEn ? 'Add a Google review?' : 'Ajouter un avis Google ?',
    reviewBody:  isEn
      ? 'We’re a one-person studio: a review weighs more for us than any ad. Two minutes of your time, and it helps the next person decide.'
      : 'On est un studio à une personne : un avis pèse plus lourd que n’importe quelle publicité. Deux minutes de votre temps, et ça aide le prochain à se décider.',
    reviewBtn:   isEn ? 'Leave a Google review →' : 'Laisser un avis Google →',
    problemTitle: isEn ? 'Something wrong?' : 'Un souci ?',
    problemBody:  isEn
      ? 'Damaged parcel, wrong item, a detail that isn’t right — reply to this email and we’ll sort it out. No form, no ticket number.'
      : 'Colis abîmé, pièce qui ne correspond pas, détail qui cloche — répondez à cet email et on règle ça. Pas de formulaire, pas de numéro de ticket.',
    orderLabel: isEn ? 'Order' : 'Commande',
    trackLink:  isEn ? 'view order' : 'voir la commande',
  }

  return (
    <EmailLayout preview={t.preview} tagline={t.tagline} locale={isEn ? 'en' : 'fr'}>
      <Hero eyebrow={t.eyebrow} title={t.title} lead={t.lead} />

      <Card tone="amber" title={t.reviewTitle}>
        <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
          {t.reviewBody}
        </Text>
      </Card>

      <Button href={GOOGLE_REVIEW_WRITE_URL} showUrl={false}>{t.reviewBtn}</Button>

      <Card title={t.problemTitle}>
        <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
          {t.problemBody}
        </Text>
      </Card>

      <Note>
        {t.orderLabel} <strong style={{ color: color.ink0, fontFamily: font.mono }}>#{orderRef}</strong> —{' '}
        <Link href={trackingUrl} style={{ color: color.amberDeep, fontWeight: 600 }}>{t.trackLink}</Link>
      </Note>
    </EmailLayout>
  )
}
