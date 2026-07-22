import {
  Html, Head, Body, Container, Section, Text, Hr,
} from 'react-email'

interface Props {
  name: string
  email: string
  subject: string
  message: string
}

const bg    = '#0A0A0B'
const card  = '#111113'
const amber = '#F59E0B'
const ink0  = '#FAFAFA'
const ink2  = '#8A8A90'
const ink3  = '#54545A'
const line  = 'rgba(255,255,255,0.08)'

export default function ContactMessage({ name, email, subject, message }: Props) {
  return (
    <Html lang="fr">
      <Head />
      <Body style={{ background: bg, margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>

          <Section style={{ textAlign: 'center', marginBottom: 20 }}>
            <Text style={{ display: 'inline-block', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 999, padding: '6px 16px', color: amber, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>
              ✉️ Message de contact
            </Text>
          </Section>

          <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 12 }}>
            <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Expéditeur</Text>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <Row label="Nom" value={name} />
                <Row label="Email" value={email} valueStyle={{ color: amber }} />
                <Row label="Sujet" value={subject} />
              </tbody>
            </table>
          </Section>

          <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
            <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Message</Text>
            <Text style={{ color: ink2, fontSize: 13, lineHeight: '1.65', margin: 0, whiteSpace: 'pre-wrap' }}>
              {message}
            </Text>
          </Section>

          <Hr style={{ borderColor: line, margin: '0 0 16px' }} />
          <Text style={{ color: ink3, fontSize: 11, textAlign: 'center', margin: 0, fontFamily: 'monospace' }}>
            3BeeStudio · Formulaire de contact — répondre directement à ce mail répond au client
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

function Row({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <tr>
      <td style={{ paddingBottom: 8, paddingRight: 16, width: '35%' }}>
        <Text style={{ color: ink3, fontSize: 12, margin: 0 }}>{label}</Text>
      </td>
      <td style={{ paddingBottom: 8 }}>
        <Text style={{ color: ink0, fontSize: 13, fontWeight: 500, margin: 0, ...valueStyle }}>{value}</Text>
      </td>
    </tr>
  )
}
