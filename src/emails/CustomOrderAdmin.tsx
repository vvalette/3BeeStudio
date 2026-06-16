import {
  Html, Head, Body, Container, Section, Text, Link, Hr,
} from 'react-email'
import type { CustomOrder } from '@/types/custom-order'

interface Props {
  order: CustomOrder
  appUrl: string
}

const bg    = '#0A0A0B'
const card  = '#111113'
const amber = '#F59E0B'
const ink0  = '#FAFAFA'
const ink2  = '#8A8A90'
const ink3  = '#54545A'
const line  = 'rgba(255,255,255,0.08)'

export default function CustomOrderAdmin({ order, appUrl }: Props) {
  const ref = `#${order.id.slice(0, 8).toUpperCase()}`

  return (
    <Html lang="fr">
      <Head />
      <Body style={{ background: bg, margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>

          <Section style={{ textAlign: 'center', marginBottom: 20 }}>
            <Text style={{ display: 'inline-block', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 999, padding: '6px 16px', color: amber, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>
              🔔 Nouvelle demande sur-mesure
            </Text>
          </Section>

          <Section style={{ textAlign: 'center', marginBottom: 24 }}>
            <Text style={{ color: ink0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 8px' }}>
              Nouvelle demande {ref}
            </Text>
            <Text style={{ color: ink2, fontSize: 13, margin: 0 }}>
              Reçue le {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Section>

          {/* Contact */}
          <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 12 }}>
            <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Contact</Text>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <Row label="Nom" value={order.name} />
                {order.company && <Row label="Société" value={order.company} />}
                <Row label="Email" value={order.email} valueStyle={{ color: amber }} />
                <Row label="Téléphone" value={order.phone} />
              </tbody>
            </table>
          </Section>

          {/* Projet */}
          <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 12 }}>
            <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Projet</Text>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <Row label="Type" value={order.project_type} />
                <Row label="Budget" value={order.budget_range} />
                <Row label="Délai" value={order.deadline} />
              </tbody>
            </table>
            {order.description && (
              <>
                <Hr style={{ borderColor: line, margin: '12px 0' }} />
                <Text style={{ color: ink3, fontSize: 11, margin: '0 0 6px' }}>Description :</Text>
                <Text style={{ color: ink2, fontSize: 13, lineHeight: '1.65', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {order.description}
                </Text>
              </>
            )}
          </Section>

          {/* Adresse */}
          {order.shipping_address && (
            <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
              <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Livraison</Text>
              <Text style={{ color: ink2, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
                {order.shipping_name}<br />
                {order.shipping_address}<br />
                {order.shipping_postal_code} {order.shipping_city}
              </Text>
            </Section>
          )}

          {/* CTA admin */}
          <Section style={{ textAlign: 'center', marginBottom: 24 }}>
            <Link
              href={`${appUrl}/admin/custom/${order.id}`}
              style={{ display: 'inline-block', background: 'linear-gradient(180deg,#FBBF24,#F59E0B)', color: '#1A1300', fontSize: 14, fontWeight: 700, borderRadius: 999, padding: '12px 28px', textDecoration: 'none' }}
            >
              Ouvrir dans l'admin →
            </Link>
          </Section>

          <Hr style={{ borderColor: line, margin: '0 0 16px' }} />
          <Text style={{ color: ink3, fontSize: 11, textAlign: 'center', margin: 0, fontFamily: 'monospace' }}>
            3BeeStudio · Notification interne
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
