import {
  Html, Head, Body, Container, Section, Text, Link, Hr,
} from 'react-email'
import type { CustomOrder } from '@/types/custom-order'

interface Props {
  order: CustomOrder
  appUrl: string
}

const bg       = '#0A0A0B'
const card     = '#111113'
const amber    = '#F59E0B'
const ink0     = '#FAFAFA'
const ink2     = '#8A8A90'
const ink3     = '#54545A'
const line     = 'rgba(255,255,255,0.08)'

export default function CustomOrderConfirmation({ order, appUrl }: Props) {
  const trackUrl = `${appUrl}/custom/${order.id}`
  const ref = `#${order.id.slice(0, 8).toUpperCase()}`

  return (
    <Html lang="fr">
      <Head />
      <Body style={{ background: bg, margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>

          {/* Header */}
          <Section style={{ background: 'linear-gradient(135deg, #1A1300 0%, #111113 100%)', borderBottom: `1px solid #2A2A30`, padding: '28px 32px 24px', textAlign: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 22, fontWeight: 800, color: amber, margin: 0, letterSpacing: '-0.5px' }}>🐝 3BeeStudio</Text>
            <Text style={{ fontSize: 12, color: ink3, margin: '4px 0 0', letterSpacing: '0.5px' }}>Impression 3D · Sur-mesure</Text>
          </Section>

          {/* Badge */}
          <Section style={{ textAlign: 'center', marginBottom: 24 }}>
            <Text style={{ display: 'inline-block', background: 'rgba(245,158,11,0.12)', border: `1px solid rgba(245,158,11,0.35)`, borderRadius: 999, padding: '6px 16px', color: amber, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>
              Demande reçue
            </Text>
          </Section>

          {/* Titre */}
          <Section style={{ textAlign: 'center', marginBottom: 32 }}>
            <Text style={{ color: ink0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: '1.1', margin: '0 0 12px' }}>
              Votre demande est bien<br />enregistrée.
            </Text>
            <Text style={{ color: ink2, fontSize: 14, lineHeight: '1.6', margin: 0 }}>
              Nous l&apos;étudions et vous enverrons un devis personnalisé sous <strong style={{ color: ink0 }}>48h ouvrées</strong>.
            </Text>
          </Section>

          {/* Carte projet */}
          <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 16 }}>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <Row label="Référence" value={ref} valueStyle={{ color: amber, fontFamily: 'monospace', fontWeight: 600 }} />
                <Row label="Projet" value={order.project_type} />
                <Row label="Budget" value={order.budget_range} />
                <Row label="Délai" value={order.deadline} />
              </tbody>
            </table>
          </Section>

          {/* Description */}
          {order.description && (
            <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '16px 24px', marginBottom: 24 }}>
              <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>Votre description</Text>
              <Text style={{ color: ink2, fontSize: 13, lineHeight: '1.65', margin: 0, whiteSpace: 'pre-wrap' }}>
                {order.description}
              </Text>
            </Section>
          )}

          {/* CTA suivi */}
          <Section style={{ textAlign: 'center', marginBottom: 24 }}>
            <Link
              href={trackUrl}
              style={{ display: 'inline-block', background: 'linear-gradient(180deg,#FBBF24,#F59E0B)', color: '#1A1300', fontSize: 14, fontWeight: 700, borderRadius: 999, padding: '14px 32px', textDecoration: 'none' }}
            >
              Suivre ma demande →
            </Link>
            <Text style={{ color: ink3, fontSize: 11, margin: '8px 0 0', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
              {trackUrl}
            </Text>
          </Section>

          {/* Étapes à venir */}
          <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
            <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 16px' }}>Prochaines étapes</Text>
            {[
              { n: '01', title: 'Étude de votre projet', desc: "Nous analysons votre demande et préparons un devis détaillé sous 48h." },
              { n: '02', title: 'Devis & acompte', desc: "Vous recevez notre devis par email. Un acompte de 50 % valide la commande." },
              { n: '03', title: 'Production & livraison', desc: "Fabrication en France, expédition avec suivi sous 5 à 10 jours ouvrés." },
            ].map((s) => (
              <table key={s.n} width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 12 }}>
                <tbody>
                  <tr>
                    <td style={{ width: 32, verticalAlign: 'top', paddingTop: 2 }}>
                      <Text style={{ color: amber, fontSize: 11, fontFamily: 'monospace', fontWeight: 700, margin: 0 }}>{s.n}</Text>
                    </td>
                    <td>
                      <Text style={{ color: ink0, fontSize: 13, fontWeight: 600, margin: '0 0 2px' }}>{s.title}</Text>
                      <Text style={{ color: ink2, fontSize: 12, lineHeight: '1.55', margin: 0 }}>{s.desc}</Text>
                    </td>
                  </tr>
                </tbody>
              </table>
            ))}
          </Section>

          <Hr style={{ borderColor: line, margin: '0 0 24px' }} />

          {/* Footer */}
          <Section style={{ textAlign: 'center' }}>
            <Text style={{ color: ink3, fontSize: 12, margin: '0 0 6px' }}>
              Une question ? Répondez à cet email ou contactez-nous :
            </Text>
            <Link href="mailto:contact@3beestudio.fr" style={{ color: amber, fontSize: 13, fontWeight: 600 }}>
              contact@3beestudio.fr
            </Link>
            <Text style={{ color: ink3, fontSize: 11, margin: '16px 0 0', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
              3BeeStudio · Studio d&apos;impression 3D · France
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

function Row({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <tr>
      <td style={{ paddingBottom: 10, paddingRight: 16, width: '40%' }}>
        <Text style={{ color: ink3, fontSize: 12, margin: 0 }}>{label}</Text>
      </td>
      <td style={{ paddingBottom: 10 }}>
        <Text style={{ color: ink0, fontSize: 13, fontWeight: 500, margin: 0, ...valueStyle }}>{value}</Text>
      </td>
    </tr>
  )
}
