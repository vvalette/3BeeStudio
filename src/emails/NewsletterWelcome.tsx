import { Section, Text } from 'react-email'
import { EmailLayout, Hero, Card, Button } from './components'
import { color } from './theme'

interface Props {
  appUrl: string
  locale?: string
}

export default function NewsletterWelcome({ appUrl, locale = 'fr' }: Props) {
  const isEn = locale === 'en'

  const t = {
    preview: isEn
      ? 'Welcome to 3BeeStudio — and a gift for you'
      : 'Bienvenue chez 3BeeStudio — un cadeau vous attend',
    tagline: isEn ? 'Honey Drops' : 'Honey Drops',
    eyebrow: isEn ? 'Subscription confirmed' : 'Inscription confirmée',
    title:   isEn ? 'Your subscription is confirmed.' : 'Votre inscription est confirmée.',
    intro:   isEn
      ? 'You’ll now receive our monthly drops directly in your inbox: new releases, limited series, exclusive deals — always before anyone else.'
      : 'Vous recevrez désormais nos drops mensuels directement dans votre boîte mail : nouveautés, séries limitées, offres exclusives — toujours en avant-première.',
    promoLabel: isEn ? 'Your welcome gift' : 'Votre cadeau de bienvenue',
    promoSub:   isEn
      ? 'off your first NFC keychain, custom or shop order'
      : 'sur votre première commande NFC, sur-mesure ou boutique',
    promoHow:  isEn ? 'How to use it' : 'Comment en profiter',
    promoHint: isEn
      ? 'When placing your NFC or custom order, mention the email address you used to subscribe to this newsletter. The discount will be applied automatically.'
      : 'Lors de votre commande NFC ou sur-mesure, mentionnez bien l’email utilisé lors de votre inscription à cette newsletter. La réduction sera appliquée automatiquement.',
    ctaBtn: isEn ? 'Explore 3BeeStudio →' : 'Explorer 3BeeStudio →',
    unsub:  isEn
      ? 'You received this email because you subscribed to 3BeeStudio Honey Drops.'
      : 'Vous recevez cet email car vous vous êtes inscrit aux Honey Drops de 3BeeStudio.',
  }

  return (
    <EmailLayout preview={t.preview} tagline={t.tagline} locale={isEn ? 'en' : 'fr'}>
      <Hero eyebrow={t.eyebrow} title={t.title} lead={t.intro} />

      <Card tone="amber">
        <Section style={{ textAlign: 'center' }}>
          <Text style={{ color: color.amberDeep, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
            {t.promoLabel}
          </Text>
          <Text style={{ color: color.amberDeep, fontSize: 44, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: '1.1', margin: '8px 0 4px' }}>
            −10 %
          </Text>
          <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.5', margin: 0 }}>
            {t.promoSub}
          </Text>
        </Section>
      </Card>

      <Card title={t.promoHow}>
        <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
          {t.promoHint}
        </Text>
      </Card>

      <Button href={appUrl} showUrl={false}>{t.ctaBtn}</Button>

      <Text style={{ color: color.ink3, fontSize: 11, lineHeight: '1.6', textAlign: 'center', margin: '0 0 20px' }}>
        {t.unsub}
      </Text>
    </EmailLayout>
  )
}
