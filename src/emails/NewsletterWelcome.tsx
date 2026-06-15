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
} from '@react-email/components'

interface Props {
  appUrl: string
}

export default function NewsletterWelcome({ appUrl }: Props) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Bienvenue dans la ruche — votre avant-première vous attend 🐝</Preview>
      <Body style={body}>
        <Container style={container}>

          <Section style={header}>
            <Text style={logo}>🐝 3BeeStudio</Text>
            <Text style={headerSub}>Impression 3D · Porte-clés NFC</Text>
          </Section>

          <Section style={section}>
            <Text style={badge}>🎉 Bienvenue dans la ruche</Text>
            <Text style={h1}>Vous êtes en avant-première.</Text>
            <Text style={intro}>
              À chaque drop mensuel, vous recevez les nouveautés avant tout le monde :
              séries limitées, pièces exclusives, collections en édition restreinte.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Promo block */}
          <Section style={{ ...section, textAlign: 'center' as const }}>
            <Text style={promoLabel}>VOTRE CADEAU DE BIENVENUE</Text>
            <Text style={promoCode}>-10%</Text>
            <Text style={promoSub}>
              sur votre première commande NFC ou sur-mesure
            </Text>
            <Text style={promoHint}>
              La réduction est appliquée automatiquement à votre prochaine commande,
              sans code à saisir.
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={{ ...section, textAlign: 'center' as const }}>
            <Text style={{ ...intro, textAlign: 'center' as const, marginBottom: 20 }}>
              Découvrez nos créations en attendant votre premier drop :
            </Text>
            <Link href={appUrl} style={ctaButton}>
              Explorer 3BeeStudio →
            </Link>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              Vous recevez cet email car vous vous êtes inscrit aux Honey Drops de 3BeeStudio.
            </Text>
            <Text style={{ ...footerText, marginTop: 8 }}>
              3BeeStudio · Studio d'impression 3D français · Belleville-en-Beaujolais
            </Text>
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

const badge: React.CSSProperties = {
  display: 'inline-block',
  backgroundColor: 'rgba(245,158,11,0.12)',
  color: '#F59E0B',
  borderRadius: 99,
  fontSize: 12,
  fontWeight: 600,
  padding: '4px 12px',
  margin: '0 0 12px',
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
  margin: '0 0 12px',
}

const promoHint: React.CSSProperties = {
  fontSize: 12,
  color: '#54545A',
  lineHeight: 1.5,
  margin: 0,
  fontStyle: 'italic',
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
