import { Text, Link } from 'react-email'
import { EmailLayout, Hero, Card, InfoTable, InfoRow, InternalFooter } from './components'
import { color, style } from './theme'

interface Props {
  name: string
  email: string
  subject: string
  message: string
}

export default function ContactMessage({ name, email, subject, message }: Props) {
  return (
    <EmailLayout
      preview={`Message de ${name} — ${subject}`}
      tagline="Formulaire de contact"
      footer={<InternalFooter note="Répondre à cet email écrit directement à l’expéditeur." />}
    >
      <Hero eyebrow="Message de contact" title={subject} />

      <Card title="Expéditeur">
        <InfoTable>
          <InfoRow label="Nom" value={name} />
          <InfoRow
            label="Email"
            value={<Link href={`mailto:${email}`} style={style.link}>{email}</Link>}
            last
          />
        </InfoTable>
      </Card>

      <Card title="Message">
        <Text style={{ color: color.ink1, fontSize: 13, lineHeight: '1.65', margin: 0, whiteSpace: 'pre-wrap' }}>
          {message}
        </Text>
      </Card>
    </EmailLayout>
  )
}
