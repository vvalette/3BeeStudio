import {
  Html, Head, Body, Container, Section, Text, Link, Hr,
} from 'react-email'
import { formatPrice } from '@/lib/utils'
import type { ShopOrder } from '@/types/shop-order'

interface Props {
  order: ShopOrder
  appUrl: string
}

const bg    = '#0A0A0B'
const card  = '#111113'
const amber = '#F59E0B'
const ink0  = '#FAFAFA'
const ink2  = '#8A8A90'
const ink3  = '#54545A'
const line  = 'rgba(255,255,255,0.08)'

export default function ShopOrderAdmin({ order, appUrl }: Props) {
  const ref      = `#${order.id.slice(0, 8).toUpperCase()}`
  const isPickup = order.delivery_mode === 'pickup'
  const isRelay  = order.delivery_mode === 'relay'
  const items    = order.items ?? []
  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <Html lang="fr">
      <Head />
      <Body style={{ background: bg, margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '32px 16px' }}>

          <Section style={{ textAlign: 'center', marginBottom: 20 }}>
            <Text style={{ display: 'inline-block', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)', borderRadius: 999, padding: '6px 16px', color: amber, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>
              🛒 Nouvelle commande boutique
            </Text>
          </Section>

          <Section style={{ textAlign: 'center', marginBottom: 24 }}>
            <Text style={{ color: ink0, fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em', margin: '0 0 8px' }}>
              {formatPrice(order.total_amount)} · {totalQty} article{totalQty > 1 ? 's' : ''}
            </Text>
            <Text style={{ color: ink2, fontSize: 13, margin: 0 }}>
              Commande {ref} — {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Section>

          {/* Mode de livraison — l'info qui décide de l'action à mener */}
          <Section style={{ textAlign: 'center', marginBottom: 12 }}>
            <Text style={{
              display: 'inline-block',
              background: isPickup ? 'rgba(56,189,248,0.10)' : 'rgba(52,211,153,0.10)',
              border: `1px solid ${isPickup ? 'rgba(56,189,248,0.30)' : 'rgba(52,211,153,0.30)'}`,
              borderRadius: 999, padding: '6px 16px', margin: 0,
              color: isPickup ? '#38BDF8' : '#34D399', fontSize: 12, fontWeight: 600,
            }}>
              {isPickup
                ? '🏠 Retrait au studio — pas d’expédition'
                : isRelay
                  ? '📍 Point relais — étiquette à générer'
                  : '📦 Livraison à domicile — étiquette à générer'}
            </Text>
          </Section>

          {/* Client */}
          <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 12 }}>
            <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Client</Text>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <Row label="Nom" value={order.name} />
                <Row label="Email" value={order.email} valueStyle={{ color: amber }} />
                {order.phone && <Row label="Téléphone" value={order.phone} />}
              </tbody>
            </table>
          </Section>

          {/* Articles */}
          <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 12 }}>
            <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Articles</Text>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                {items.map((item, i) => (
                  <tr key={`${item.product_id}-${i}`}>
                    <td style={{ paddingBottom: 8, paddingRight: 16 }}>
                      <Text style={{ color: ink0, fontSize: 13, fontWeight: 500, margin: 0 }}>
                        {item.quantity} × {item.product_name}
                      </Text>
                      {(item.custom_field_values ?? []).map((f) => (
                        <Text key={f.key} style={{ color: ink3, fontSize: 11, margin: '2px 0 0' }}>
                          {f.label} : {f.value}
                        </Text>
                      ))}
                    </td>
                    <td style={{ paddingBottom: 8, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Text style={{ color: ink2, fontSize: 13, margin: 0 }}>
                        {formatPrice(item.unit_price * item.quantity)}
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Hr style={{ borderColor: line, margin: '12px 0' }} />
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tbody>
                <Total label="Sous-total" value={formatPrice(order.subtotal)} />
                {order.discount_amount > 0 && (
                  <Total label="Réduction newsletter" value={`−${formatPrice(order.discount_amount)}`} valueStyle={{ color: '#34D399' }} />
                )}
                <Total label="Livraison" value={order.shipping === 0 ? 'Offerte' : formatPrice(order.shipping)} />
                <Total label="Total payé" value={formatPrice(order.total_amount)} valueStyle={{ color: amber, fontWeight: 700, fontSize: 15 }} />
              </tbody>
            </table>
          </Section>

          {/* Point relais — l'info clé pour l'étiquette */}
          {isRelay && order.pickup_point_name && (
            <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 12 }}>
              <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Point relais choisi</Text>
              <Text style={{ color: ink2, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
                <span style={{ color: ink0, fontWeight: 600 }}>{order.pickup_point_name}</span><br />
                {order.pickup_point_street}<br />
                {order.pickup_point_postal_code} {order.pickup_point_city}<br />
                <span style={{ color: ink3, fontSize: 11, fontFamily: 'monospace' }}>Code Boxtal : {order.pickup_point_code}</span>
              </Text>
            </Section>
          )}

          {/* Adresse — absente en retrait studio */}
          {!isPickup && order.shipping_address && (
            <Section style={{ background: card, border: `1px solid ${line}`, borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
              <Text style={{ color: ink3, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 12px' }}>Adresse de livraison</Text>
              <Text style={{ color: ink2, fontSize: 13, lineHeight: '1.65', margin: 0 }}>
                {order.shipping_name}<br />
                {order.shipping_address}<br />
                {order.shipping_address2 && <>{order.shipping_address2}<br /></>}
                {order.shipping_postal_code} {order.shipping_city}<br />
                {order.shipping_country}
              </Text>
            </Section>
          )}

          {/* CTA admin */}
          <Section style={{ textAlign: 'center', marginBottom: 24 }}>
            <Link
              href={`${appUrl}/admin/boutique/commande/${order.id}`}
              style={{ display: 'inline-block', background: 'linear-gradient(180deg,#FBBF24,#F59E0B)', color: '#1A1300', fontSize: 14, fontWeight: 700, borderRadius: 999, padding: '12px 28px', textDecoration: 'none' }}
            >
              {isPickup ? 'Ouvrir dans l’admin →' : 'Préparer l’expédition →'}
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

function Total({ label, value, valueStyle }: { label: string; value: string; valueStyle?: React.CSSProperties }) {
  return (
    <tr>
      <td style={{ paddingBottom: 6 }}>
        <Text style={{ color: ink3, fontSize: 12, margin: 0 }}>{label}</Text>
      </td>
      <td style={{ paddingBottom: 6, textAlign: 'right' }}>
        <Text style={{ color: ink0, fontSize: 13, fontWeight: 500, margin: 0, ...valueStyle }}>{value}</Text>
      </td>
    </tr>
  )
}
