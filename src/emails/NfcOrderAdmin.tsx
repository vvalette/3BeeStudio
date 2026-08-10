import {
  Html, Head, Body, Container, Section, Text, Link, Hr,
} from 'react-email'
import { formatDestination } from '@/types/order'
import { formatPrice } from '@/lib/utils'
import type { Order } from '@/types/order'

interface Props {
  order: Order
  appUrl: string
}

const bg    = '#0A0A0B'
const card  = '#111113'
const amber = '#F59E0B'
const ink0  = '#FAFAFA'
const ink2  = '#8A8A90'
const ink3  = '#54545A'
const line  = 'rgba(255,255,255,0.08)'

export default function NfcOrderAdmin({ order, appUrl }: Props) {
  const ref = `#${order.id.slice(0, 8).toUpperCase()}`

  return (
    <Html lang="fr">
      <Head />
      <Body style={{ background: bg, margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>

          <Section style={{ textAlign: 'center', marginBottom: 20 }}>
            <Text style={{ display: 'inline-block', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 999, padding: '6px 16px', color: amber, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>
              💰 Nouvelle commande NFC payée
            </Text>
          </Section>

          <Section style={{ textAlign: 'center', marginBottom: 24 }}>
            <Text style={{ color: ink0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 8px' }}>
              {formatPrice(order.total_amount)} · {order.quantity} porte-clés
            </Text>
            <Text style={{ color: ink2, fontSize: 13, margin: 0 }}>
              Commande {ref} — {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Section>

          {/* Client */}
          <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 12 }}>
            <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Client</Text>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <Row label="Société" value={order.company} />
                <Row label="Email" value={order.email} valueStyle={{ color: amber }} />
                <Row label="Téléphone" value={order.phone} />
                <Row label="Secteur" value={order.sector} />
              </tbody>
            </table>
          </Section>

          {/* Commande */}
          <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 12 }}>
            <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Commande</Text>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <Row label="Quantité" value={`${order.quantity} porte-clés`} />
                <Row label="Prix unitaire" value={formatPrice(order.unit_price)} />
                <Row label="Total payé" value={formatPrice(order.total_amount)} valueStyle={{ color: amber, fontWeight: 700 }} />
              </tbody>
            </table>
            <Hr style={{ borderColor: line, margin: '12px 0' }} />
            <Text style={{ color: ink3, fontSize: 11, margin: '0 0 6px' }}>Destination NFC :</Text>
            <Text style={{ color: ink2, fontSize: 13, lineHeight: '1.65', margin: 0, wordBreak: 'break-all' }}>
              {formatDestination(order.nfc_url)}
            </Text>
            {order.logo_url && (
              <Text style={{ margin: '12px 0 0' }}>
                <Link href={order.logo_url} style={{ color: amber, fontSize: 13, fontWeight: 600 }}>
                  📎 Télécharger le logo
                </Link>
              </Text>
            )}
          </Section>

          {/* Livraison */}
          {order.shipping_address && (
            <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
              <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Livraison</Text>
              <Text style={{ color: ink2, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
                {order.shipping_name}<br />
                {order.shipping_address}<br />
                {order.shipping_address2 && <>{order.shipping_address2}<br /></>}
                {order.shipping_postal_code} {order.shipping_city}
              </Text>
            </Section>
          )}

          {/* CTA admin */}
          <Section style={{ textAlign: 'center', marginBottom: 24 }}>
            <Link
              href={`${appUrl}/admin/commandes/${order.id}`}
              style={{ display: 'inline-block', background: 'linear-gradient(180deg,#FBBF24,#F59E0B)', color: '#1A1300', fontSize: 14, fontWeight: 700, borderRadius: 999, padding: '12px 28px', textDecoration: 'none' }}
            >
              Ouvrir dans l&apos;admin →
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
