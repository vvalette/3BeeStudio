import React from 'react'
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr, Row, Column,
} from 'react-email'
import type { ShopOrder } from '@/types/shop-order'

interface Props {
  order: ShopOrder
  appUrl: string
  locale?: string
}

export default function ShopOrderConfirmation({ order, appUrl, locale = 'fr' }: Props) {
  const isEn      = locale === 'en'
  const orderRef  = order.id.slice(0, 8).toUpperCase()
  const trackingUrl = isEn
    ? `${appUrl}/en/boutique/suivi/${order.id}`
    : `${appUrl}/boutique/suivi/${order.id}`

  const fmt = (cents: number) =>
    new Intl.NumberFormat(isEn ? 'en-GB' : 'fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(cents / 100)

  const copy = {
    preview:      isEn ? `Order #${orderRef} confirmed — 3BeeStudio` : `Commande #${orderRef} confirmée — 3BeeStudio`,
    headerSub:    isEn ? '3D Printing · Shop' : 'Impression 3D · Boutique',
    badge:        isEn ? '✅ Payment received' : '✅ Paiement reçu',
    h1:           isEn ? 'Your order is confirmed!' : 'Votre commande est confirmée !',
    intro:        isEn
      ? `Thank you ${order.name} — we've received your payment. Your order is being prepared in our studio.`
      : `Merci ${order.name} — nous avons bien reçu votre paiement. Votre commande est en cours de préparation dans nos studios.`,
    summaryTitle: isEn ? 'ORDER SUMMARY' : 'RÉCAPITULATIF DE COMMANDE',
    qty:          isEn ? 'Qty' : 'Qté',
    subtotal:          isEn ? 'Subtotal' : 'Sous-total',
    newsletterDiscount: isEn ? 'Newsletter discount (−10%)' : 'Réduction newsletter (−10%)',
    shipping:          isEn ? 'Shipping' : 'Livraison',
    shippingFree:      isEn ? 'Free' : 'Offerte',
    total:             isEn ? 'Total paid' : 'Total payé',
    pickupTitle:  isEn ? 'STUDIO PICKUP' : 'RETRAIT EN STUDIO',
    pickupAddress: '144 rue de la République\n69220 Belleville-en-Beaujolais',
    pickupHint:   isEn
      ? "We'll contact you to arrange a pickup time."
      : "Nous vous contacterons pour convenir d'un créneau de retrait.",
    deliveryTitle: isEn ? 'DELIVERY' : 'LIVRAISON',
    relayTitle:   isEn ? 'PICKUP POINT' : 'POINT RELAIS',
    relayHint:    isEn
      ? 'Collect within 10 days with photo ID. You will be notified when your parcel arrives.'
      : "Retrait sous 10 jours avec une pièce d'identité. Vous serez prévenu dès l'arrivée du colis.",
    ctaText:      isEn ? 'Track your order in real time:' : "Suivez l'avancement de votre commande en temps réel :",
    ctaBtn:       isEn ? 'Track my order →' : 'Suivre ma commande →',
    refLabel:     isEn ? 'Order reference:' : 'Référence commande :',
    question:     isEn
      ? 'Any questions? Reply to this email or write to'
      : 'Une question ? Répondez directement à cet email ou écrivez à',
    footerStudio: isEn ? '3D Printing · Made in France' : 'Impression 3D française',
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
            <Text style={badge}>{copy.badge}</Text>
            <Text style={h1}>{copy.h1}</Text>
            <Text style={intro}>{copy.intro}</Text>
          </Section>

          <Section style={section}>
            <Text style={sectionTitle}>{copy.summaryTitle}</Text>
            <div style={card}>
              {order.items.map((item, i) => (
                <Row key={i} style={i > 0 ? { ...itemRow, borderTop: '1px solid #1f1f25' } : itemRow}>
                  <Column>
                    <Text style={itemName}>{item.product_name}</Text>
                    <Text style={itemMeta}>{copy.qty} : {item.quantity} × {fmt(item.unit_price)}</Text>
                  </Column>
                  <Column align="right">
                    <Text style={itemTotal}>{fmt(item.unit_price * item.quantity)}</Text>
                  </Column>
                </Row>
              ))}
              <Hr style={divider} />
              <Row style={itemRow}>
                <Column><Text style={itemMeta}>{copy.subtotal}</Text></Column>
                <Column align="right"><Text style={itemMeta}>{fmt(order.subtotal)}</Text></Column>
              </Row>
              {(order.discount_amount ?? 0) > 0 && (
                <Row style={itemRow}>
                  <Column><Text style={{ ...itemMeta, color: '#34d399' }}>{copy.newsletterDiscount}</Text></Column>
                  <Column align="right"><Text style={{ ...itemMeta, color: '#34d399' }}>−{fmt(order.discount_amount)}</Text></Column>
                </Row>
              )}
              <Row style={itemRow}>
                <Column><Text style={itemMeta}>{copy.shipping}</Text></Column>
                <Column align="right"><Text style={itemMeta}>{order.shipping === 0 ? copy.shippingFree : fmt(order.shipping)}</Text></Column>
              </Row>
              <Hr style={divider} />
              <Row style={itemRow}>
                <Column><Text style={{ ...itemName, color: '#F59E0B' }}>{copy.total}</Text></Column>
                <Column align="right"><Text style={{ ...itemName, color: '#F59E0B' }}>{fmt(order.total_amount)}</Text></Column>
              </Row>
            </div>
          </Section>

          <Section style={section}>
            {order.delivery_mode === 'pickup' ? (
              <>
                <Text style={sectionTitle}>{copy.pickupTitle}</Text>
                <Text style={address}>
                  144 rue de la République<br />
                  69220 Belleville-en-Beaujolais
                </Text>
                <Text style={{ ...address, marginTop: 8, fontSize: 13, fontStyle: 'italic' }}>
                  {copy.pickupHint}
                </Text>
              </>
            ) : order.delivery_mode === 'relay' ? (
              <>
                <Text style={sectionTitle}>{copy.relayTitle}</Text>
                <Text style={address}>
                  <strong style={{ color: '#FAFAFA' }}>{order.pickup_point_name}</strong><br />
                  {order.pickup_point_street}<br />
                  {order.pickup_point_postal_code} {order.pickup_point_city}
                </Text>
                <Text style={{ ...address, marginTop: 8, fontSize: 13, fontStyle: 'italic' }}>
                  {copy.relayHint}
                </Text>
              </>
            ) : (
              <>
                <Text style={sectionTitle}>{copy.deliveryTitle}</Text>
                <Text style={address}>
                  {order.shipping_name}<br />
                  {order.shipping_address}{order.shipping_address2 ? `, ${order.shipping_address2}` : ''}<br />
                  {order.shipping_postal_code} {order.shipping_city}
                </Text>
              </>
            )}
          </Section>

          <Section style={{ ...section, textAlign: 'center' as const }}>
            <Text style={ctaText}>{copy.ctaText}</Text>
            <Link href={trackingUrl} style={ctaBtn}>{copy.ctaBtn}</Link>
          </Section>

          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              {copy.refLabel} <strong style={{ color: '#C9C9CE' }}>#{orderRef}</strong>
            </Text>
            <Text style={footerText}>
              {copy.question}{' '}
              <Link href="mailto:contact@3beestudio.fr" style={{ color: '#F59E0B' }}>contact@3beestudio.fr</Link>
            </Text>
            <Text style={footerText}>© {new Date().getFullYear()} 3BeeStudio · {copy.footerStudio}</Text>
          </Section>

        </Container>
      </Body>
    </Html>
  )
}

const body:        React.CSSProperties = { backgroundColor: '#0A0A0B', fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0 }
const container:   React.CSSProperties = { maxWidth: '560px', margin: '0 auto', padding: '24px 16px' }
const header:      React.CSSProperties = { textAlign: 'center', padding: '32px 0 16px' }
const logo:        React.CSSProperties = { fontSize: '20px', fontWeight: 800, color: '#F59E0B', margin: 0 }
const headerSub:   React.CSSProperties = { fontSize: '12px', color: '#54545A', margin: '4px 0 0', letterSpacing: '0.1em', textTransform: 'uppercase' as const }
const section:     React.CSSProperties = { padding: '16px 0' }
const badge:       React.CSSProperties = { display: 'inline-block', fontSize: '13px', color: '#34d399', backgroundColor: 'rgba(52,211,153,0.1)', borderRadius: '20px', padding: '4px 14px', margin: '0 0 12px' }
const h1:          React.CSSProperties = { fontSize: '24px', fontWeight: 800, color: '#FAFAFA', margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: '1.2' }
const intro:       React.CSSProperties = { fontSize: '15px', color: '#8C8C94', lineHeight: '1.6', margin: '0 0 8px' }
const sectionTitle:React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: '#54545A', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 10px' }
const card:        React.CSSProperties = { backgroundColor: '#111114', border: '1px solid #1f1f25', borderRadius: '12px', padding: '16px 20px' }
const itemRow:     React.CSSProperties = { padding: '8px 0' }
const itemName:    React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#FAFAFA', margin: 0 }
const itemMeta:    React.CSSProperties = { fontSize: '13px', color: '#8C8C94', margin: '2px 0 0' }
const itemTotal:   React.CSSProperties = { fontSize: '14px', fontWeight: 600, color: '#C9C9CE', margin: 0 }
const divider:     React.CSSProperties = { borderColor: '#1f1f25', margin: '8px 0' }
const address:     React.CSSProperties = { fontSize: '14px', color: '#8C8C94', lineHeight: '1.7', margin: 0 }
const ctaText:     React.CSSProperties = { fontSize: '14px', color: '#8C8C94', margin: '0 0 16px' }
const ctaBtn:      React.CSSProperties = { display: 'inline-block', backgroundColor: '#F59E0B', color: '#0A0A0B', fontWeight: 700, fontSize: '14px', padding: '12px 28px', borderRadius: '999px', textDecoration: 'none' }
const footer:      React.CSSProperties = { padding: '16px 0 8px', textAlign: 'center' as const }
const footerText:  React.CSSProperties = { fontSize: '12px', color: '#54545A', margin: '4px 0', lineHeight: '1.5' }
