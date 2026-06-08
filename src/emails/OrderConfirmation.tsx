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
  Row,
  Column,
} from '@react-email/components'

interface Props {
  company: string
  email: string
  quantity: number
  destination: string
  totalAmount: number
  orderId: string
  appUrl: string
}

export default function OrderConfirmation({
  company,
  quantity,
  destination,
  totalAmount,
  orderId,
  appUrl,
}: Props) {
  const orderRef = orderId.slice(0, 8).toUpperCase()
  const trackingUrl = `${appUrl}/suivi/${orderId}`
  const total = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(totalAmount / 100)

  return (
    <Html lang="fr">
      <Head />
      <Preview>Commande confirmée — {String(quantity)} porte-clés NFC pour {company}</Preview>
      <Body style={body}>
        <Container style={container}>

          {/* Header */}
          <Section style={header}>
            <Text style={logo}>🐝 3BeeStudio</Text>
            <Text style={headerSub}>Impression 3D · Porte-clés NFC</Text>
          </Section>

          {/* Titre */}
          <Section style={section}>
            <Text style={badge}>✅ Paiement reçu</Text>
            <Text style={h1}>Votre commande est confirmée !</Text>
            <Text style={intro}>
              Merci <strong>{company}</strong> — nous avons bien reçu votre paiement.
              Vos porte-clés NFC vont être imprimés en 3D et programmés à la main dans nos ateliers.
            </Text>
          </Section>

          <Hr style={divider} />

          {/* Récap commande */}
          <Section style={section}>
            <Text style={sectionTitle}>Récapitulatif de la commande</Text>

            <Row style={tableRow}>
              <Column style={labelCol}>Référence</Column>
              <Column style={valueCol}><strong style={{ fontFamily: 'monospace' }}>#{orderRef}</strong></Column>
            </Row>
            <Row style={tableRow}>
              <Column style={labelCol}>Entreprise</Column>
              <Column style={valueCol}>{company}</Column>
            </Row>
            <Row style={tableRow}>
              <Column style={labelCol}>Quantité</Column>
              <Column style={valueCol}>{String(quantity)} porte-clés NFC</Column>
            </Row>
            <Row style={tableRow}>
              <Column style={labelCol}>Destination NFC</Column>
              <Column style={valueCol}>{destination}</Column>
            </Row>
            <Row style={{ ...tableRow, borderTop: '1px solid #2A2A30' }}>
              <Column style={{ ...labelCol, paddingTop: 12 }}>Total réglé</Column>
              <Column style={{ ...valueCol, paddingTop: 12, color: '#F59E0B', fontWeight: 700, fontSize: 16 }}>{total}</Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* Timeline */}
          <Section style={section}>
            <Text style={sectionTitle}>Prochaines étapes</Text>

            <Row style={stepRow}>
              <Column style={stepDot}><span style={dot}>1</span></Column>
              <Column style={stepText}>
                <strong style={{ color: '#FAFAFA' }}>Validation sous 24h</strong>
                <br />
                <span style={{ color: '#87878E' }}>Nous vérifions votre logo et vos paramètres NFC.</span>
              </Column>
            </Row>
            <Row style={stepRow}>
              <Column style={stepDot}><span style={dot}>2</span></Column>
              <Column style={stepText}>
                <strong style={{ color: '#FAFAFA' }}>Impression & programmation</strong>
                <br />
                <span style={{ color: '#87878E' }}>Chaque porte-clé est imprimé et programmé à la main.</span>
              </Column>
            </Row>
            <Row style={stepRow}>
              <Column style={stepDot}><span style={dot}>3</span></Column>
              <Column style={stepText}>
                <strong style={{ color: '#FAFAFA' }}>Expédition</strong>
                <br />
                <span style={{ color: '#87878E' }}>Livraison suivie sous 5 à 10 jours ouvrés.</span>
              </Column>
            </Row>
          </Section>

          <Hr style={divider} />

          {/* CTA suivi */}
          <Section style={{ ...section, textAlign: 'center' }}>
            <Text style={{ ...intro, textAlign: 'center', marginBottom: 20 }}>
              Suivez l'avancement de votre commande en temps réel :
            </Text>
            <Link href={trackingUrl} style={ctaButton}>
              Suivre ma commande →
            </Link>
          </Section>

          <Hr style={divider} />

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Une question ? Répondez simplement à cet email.
            </Text>
            <Text style={{ ...footerText, marginTop: 8 }}>
              3BeeStudio · Studio d'impression 3D français
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  backgroundColor: 'rgba(52,211,153,0.12)',
  color: '#34d399',
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

const sectionTitle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#54545A',
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  margin: '0 0 16px',
}

const tableRow: React.CSSProperties = {
  borderBottom: '1px solid #1E1E24',
}

const labelCol: React.CSSProperties = {
  fontSize: 13,
  color: '#87878E',
  padding: '10px 0',
  width: '40%',
}

const valueCol: React.CSSProperties = {
  fontSize: 13,
  color: '#C9C9CE',
  padding: '10px 0',
  textAlign: 'right',
}

const stepRow: React.CSSProperties = {
  marginBottom: 16,
}

const stepDot: React.CSSProperties = {
  width: 32,
  verticalAlign: 'top',
  paddingTop: 2,
}

const dot: React.CSSProperties = {
  display: 'inline-block',
  width: 22,
  height: 22,
  borderRadius: '50%',
  backgroundColor: 'rgba(245,158,11,0.15)',
  color: '#F59E0B',
  fontSize: 11,
  fontWeight: 700,
  lineHeight: '22px',
  textAlign: 'center',
}

const stepText: React.CSSProperties = {
  fontSize: 13,
  color: '#C9C9CE',
  lineHeight: 1.5,
  verticalAlign: 'top',
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
