import React from 'react'
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from 'react-email'

interface Props {
  appUrl: string
  locale?: string
}

export default function NewsletterWelcome({ appUrl, locale = 'fr' }: Props) {
  const isEn = locale === 'en'

  const copy = {
    preview:     isEn ? 'Welcome to 3BeeStudio — and a gift for you 🐝' : 'Bienvenue chez 3BeeStudio — un cadeau vous attend 🐝',
    headerSub:   isEn ? '3D Printing · NFC Keychains' : 'Impression 3D · Porte-clés NFC',
    h1:          isEn ? 'Your subscription is confirmed.' : 'Votre inscription est confirmée.',
    intro:       isEn
      ? 'You\'ll now receive our monthly drops directly in your inbox: new releases, limited series, exclusive deals — always before anyone else.'
      : 'Vous recevrez désormais nos drops mensuels directement dans votre boîte mail : nouveautés, séries limitées, offres exclusives — toujours en avant-première.',
    promoLabel:  isEn ? 'YOUR WELCOME GIFT' : 'VOTRE CADEAU DE BIENVENUE',
    promoSub:    isEn ? 'off your first NFC keychain, custom or shop order' : 'sur votre première commande NFC, sur-mesure ou boutique',
    promoHow:    isEn ? 'How to use it:' : 'Comment en profiter :',
    promoHint:   isEn
      ? 'When placing your NFC or custom order, mention the email address you used to subscribe to this newsletter. The discount will be applied automatically.'
      : "Lors de votre commande NFC ou sur-mesure, mentionnez bien l'email utilisé lors de votre inscription à cette newsletter. La réduction sera appliquée automatiquement.",
    ctaIntro:    isEn ? 'Discover our creations:' : 'Découvrez nos créations :',
    ctaBtn:      isEn ? 'Explore 3BeeStudio →' : 'Explorer 3BeeStudio →',
    footerUnsub: isEn
      ? 'You received this email because you subscribed to 3BeeStudio Honey Drops.'
      : 'Vous recevez cet email car vous vous êtes inscrit aux Honey Drops de 3BeeStudio.',
    footerStudio: isEn
      ? '3BeeStudio · French 3D printing studio · Belleville-en-Beaujolais'
      : "3BeeStudio · Studio d'impression 3D français · Belleville-en-Beaujolais",
  }

  return (
    <Html lang={isEn ? 'en' : 'fr'}>
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={body}>
        <Container style={container}>

          <Section style={header}>
            <Text style={logo}>🐝 3BeeStudio</Text>
            <Text style={headerSub}>{copy.headerSub}</Text>
          </Section>

          <Section style={section}>
            <Text style={h1}>{copy.h1}</Text>
            <Text style={intro}>{copy.intro}</Text>
          </Section>

          <Hr style={divider} />

          {/* Promo block */}
          <Section style={{ ...section, textAlign: 'center' as const }}>
            <Text style={promoLabel}>{copy.promoLabel}</Text>
            <Text style={promoCode}>-10%</Text>
            <Text style={promoSub}>{copy.promoSub}</Text>
            <div style={promoBox}>
              <Text style={promoHowLabel}>{copy.promoHow}</Text>
              <Text style={promoHint}>{copy.promoHint}</Text>
            </div>
          </Section>

          <Hr style={divider} />

          <Section style={{ ...section, textAlign: 'center' as const }}>
            <Text style={{ ...intro, textAlign: 'center' as const, marginBottom: 20 }}>
              {copy.ctaIntro}
            </Text>
            <Link href={appUrl} style={ctaButton}>
              {copy.ctaBtn}
            </Link>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>{copy.footerUnsub}</Text>
            <Text style={{ ...footerText, marginTop: 8 }}>{copy.footerStudio}</Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

const body: React.CSSProperties = {
  backgroundColor: '#0A0A0B',
  fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
  margin: 0,
  padding: '40px 0',
}

const container: React.CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  backgroundColor: '#111113',
  borderRadius: 16,
  border: '1px solid #1E1E24',
  overflow: 'hidden',
}

const header: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1A1300 0%, #111113 100%)',
  borderBottom: '1px solid #2A2A30',
  padding: '28px 32px 24px',
  textAlign: 'center',
}

const logo: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: '#F59E0B',
  margin: 0,
  letterSpacing: '-0.5px',
}

const headerSub: React.CSSProperties = {
  fontSize: 12,
  color: '#54545A',
  margin: '4px 0 0',
  letterSpacing: '0.5px',
}

const section: React.CSSProperties = {
  padding: '24px 32px',
}

const h1: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: '#FAFAFA',
  margin: '0 0 12px',
  lineHeight: 1.3,
}

const intro: React.CSSProperties = {
  fontSize: 14,
  color: '#C9C9CE',
  lineHeight: 1.6,
  margin: 0,
}

const promoLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#54545A',
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  margin: '0 0 8px',
}

const promoCode: React.CSSProperties = {
  fontSize: 56,
  fontWeight: 800,
  color: '#F59E0B',
  margin: '0 0 4px',
  lineHeight: 1,
  letterSpacing: '-2px',
}

const promoSub: React.CSSProperties = {
  fontSize: 15,
  color: '#FAFAFA',
  fontWeight: 600,
  margin: '0 0 16px',
}

const promoBox: React.CSSProperties = {
  backgroundColor: 'rgba(245,158,11,0.07)',
  border: '1px solid rgba(245,158,11,0.2)',
  borderRadius: 10,
  padding: '12px 16px',
  textAlign: 'left',
  maxWidth: 360,
  margin: '0 auto',
}

const promoHowLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#F59E0B',
  margin: '0 0 4px',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
}

const promoHint: React.CSSProperties = {
  fontSize: 13,
  color: '#C9C9CE',
  lineHeight: 1.55,
  margin: 0,
}

const ctaButton: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#F59E0B',
  color: '#1A1300',
  fontWeight: 700,
  fontSize: 14,
  padding: '13px 28px',
  borderRadius: 999,
  textDecoration: 'none',
  letterSpacing: '-0.2px',
}

const divider: React.CSSProperties = {
  borderColor: '#1E1E24',
  margin: 0,
}

const footer: React.CSSProperties = {
  padding: '20px 32px 24px',
  textAlign: 'center',
}

const footerText: React.CSSProperties = {
  fontSize: 12,
  color: '#54545A',
  margin: 0,
  lineHeight: 1.6,
}
