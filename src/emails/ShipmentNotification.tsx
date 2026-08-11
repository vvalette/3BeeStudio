import React from 'react'
import {
  Html, Head, Preview, Body, Container, Section, Text, Link, Hr,
} from 'react-email'

/**
 * Email « votre commande est expédiée », partagé par les flux boutique et NFC.
 * Les deux tables n'ont pas la même forme (ShopOrder a des items, Order a une
 * quantité de porte-clés) → on ne prend que les champs communs au montage.
 *
 * `deliveryMode` porte le mode boutique ; le flux NFC est toujours en 'delivery'.
 */
export interface ShipmentNotificationProps {
  recipientName: string
  orderRef: string
  trackingUrl: string          // page de suivi 3BeeStudio
  carrierTrackingNumber: string | null
  carrierTrackingUrl: string | null
  deliveryMode: 'delivery' | 'pickup' | 'relay'
  relay?: {
    name: string | null
    street: string | null
    postalCode: string | null
    city: string | null
  }
  address?: {
    name: string | null
    line1: string | null
    line2: string | null
    postalCode: string | null
    city: string | null
  }
  locale?: string
}

export default function ShipmentNotification({
  recipientName,
  orderRef,
  trackingUrl,
  carrierTrackingNumber,
  carrierTrackingUrl,
  deliveryMode,
  relay,
  address,
  locale = 'fr',
}: ShipmentNotificationProps) {
  const isEn = locale === 'en'
  const isRelay = deliveryMode === 'relay'

  const copy = {
    preview:      isEn ? `Order #${orderRef} shipped — 3BeeStudio` : `Commande #${orderRef} expédiée — 3BeeStudio`,
    headerSub:    isEn ? '3D Printing · Made in France' : 'Impression 3D française',
    badge:        isEn ? '📦 On its way' : '📦 En route',
    h1:           isEn ? 'Your order has shipped!' : 'Votre commande est expédiée !',
    intro:        isEn
      ? `Good news ${recipientName} — your parcel has left our studio.`
      : `Bonne nouvelle ${recipientName} — votre colis a quitté nos studios.`,
    trackingTitle: isEn ? 'TRACKING NUMBER' : 'NUMÉRO DE SUIVI',
    trackingHint: isEn
      ? 'It can take up to 24 h for the carrier to show the first scan.'
      : 'Le transporteur peut mettre jusqu’à 24 h avant d’afficher le premier scan.',
    carrierBtn:   isEn ? 'Track with the carrier →' : 'Suivre chez le transporteur →',
    relayTitle:   isEn ? 'DELIVERED TO YOUR PICKUP POINT' : 'LIVRAISON EN POINT RELAIS',
    relayHint:    isEn
      ? 'You will be notified when your parcel arrives. Collect it within 10 days with photo ID.'
      : "Vous serez prévenu dès l'arrivée du colis. Retrait sous 10 jours avec une pièce d'identité.",
    deliveryTitle: isEn ? 'DELIVERY ADDRESS' : 'ADRESSE DE LIVRAISON',
    ctaText:      isEn ? 'Follow every step on your tracking page:' : 'Suivez chaque étape sur votre page de suivi :',
    ctaBtn:       isEn ? 'View my order →' : 'Voir ma commande →',
    refLabel:     isEn ? 'Order reference:' : 'Référence commande :',
    question:     isEn
      ? 'A problem with your delivery? Reply to this email or write to'
      : 'Un souci avec votre livraison ? Répondez à cet email ou écrivez à',
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

          {carrierTrackingNumber && (
            <Section style={section}>
              <Text style={sectionTitle}>{copy.trackingTitle}</Text>
              <div style={card}>
                <Text style={trackingNumber}>{carrierTrackingNumber}</Text>
                {carrierTrackingUrl && (
                  <Text style={{ margin: '10px 0 0' }}>
                    <Link href={carrierTrackingUrl} style={carrierLink}>{copy.carrierBtn}</Link>
                  </Text>
                )}
              </div>
              <Text style={{ ...intro, fontSize: 13, margin: '8px 0 0' }}>{copy.trackingHint}</Text>
            </Section>
          )}

          <Section style={section}>
            {isRelay && relay?.name ? (
              <>
                <Text style={sectionTitle}>{copy.relayTitle}</Text>
                <Text style={addressStyle}>
                  <strong style={{ color: '#FAFAFA' }}>{relay.name}</strong><br />
                  {relay.street}<br />
                  {relay.postalCode} {relay.city}
                </Text>
                <Text style={{ ...addressStyle, marginTop: 8, fontSize: 13, fontStyle: 'italic' }}>
                  {copy.relayHint}
                </Text>
              </>
            ) : address?.line1 ? (
              <>
                <Text style={sectionTitle}>{copy.deliveryTitle}</Text>
                <Text style={addressStyle}>
                  {address.name}<br />
                  {address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />
                  {address.postalCode} {address.city}
                </Text>
              </>
            ) : null}
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
            <Text style={footerText}>© {new Date().getFullYear()} 3BeeStudio · {copy.headerSub}</Text>
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
const badge:       React.CSSProperties = { display: 'inline-block', fontSize: '13px', color: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', borderRadius: '20px', padding: '4px 14px', margin: '0 0 12px' }
const h1:          React.CSSProperties = { fontSize: '24px', fontWeight: 800, color: '#FAFAFA', margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: '1.2' }
const intro:       React.CSSProperties = { fontSize: '15px', color: '#8C8C94', lineHeight: '1.6', margin: '0 0 8px' }
const sectionTitle:React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: '#54545A', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 10px' }
const card:        React.CSSProperties = { backgroundColor: '#111114', border: '1px solid #1f1f25', borderRadius: '12px', padding: '16px 20px' }
const trackingNumber: React.CSSProperties = { fontSize: '17px', fontWeight: 700, color: '#FAFAFA', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.04em', margin: 0 }
const carrierLink: React.CSSProperties = { fontSize: '13px', color: '#F59E0B', textDecoration: 'none', fontWeight: 600 }
const divider:     React.CSSProperties = { borderColor: '#1f1f25', margin: '8px 0' }
const addressStyle:React.CSSProperties = { fontSize: '14px', color: '#8C8C94', lineHeight: '1.7', margin: 0 }
const ctaText:     React.CSSProperties = { fontSize: '14px', color: '#8C8C94', margin: '0 0 16px' }
const ctaBtn:      React.CSSProperties = { display: 'inline-block', backgroundColor: '#F59E0B', color: '#0A0A0B', fontWeight: 700, fontSize: '14px', padding: '12px 28px', borderRadius: '999px', textDecoration: 'none' }
const footer:      React.CSSProperties = { padding: '16px 0 8px', textAlign: 'center' as const }
const footerText:  React.CSSProperties = { fontSize: '12px', color: '#54545A', margin: '4px 0', lineHeight: '1.5' }
