import React from 'react'
import { Html, Head, Preview, Body, Container, Section, Text, Link } from 'react-email'
import { color, font, style } from './theme'

/**
 * Briques partagées par tous les emails transactionnels.
 *
 * Chaque template redéfinissait auparavant son en-tête, ses cartes et son pied
 * de page : neuf variantes qui avaient dérivé les unes des autres. Tout passe
 * maintenant par ici, donc un changement de charte se fait en un endroit.
 *
 * Contrainte de fond : un email n'est pas une page web. Pas de flex, pas de
 * grid, pas de variables CSS — on reste sur des tables et des styles inline,
 * seul terrain commun à Gmail, Outlook et Apple Mail.
 */

export function EmailLayout({
  preview,
  tagline = 'Studio d’impression 3D',
  locale = 'fr',
  children,
  footer,
}: {
  preview: string
  tagline?: string
  locale?: string
  children: React.ReactNode
  /** Remplace le pied de page par défaut (contact + mentions). */
  footer?: React.ReactNode
}) {
  const isEn = locale === 'en'

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={style.body}>
        <Container style={style.container}>
          <Section style={style.header}>
            <Text style={style.wordmark}>3BeeStudio</Text>
            <Text style={style.tagline}>{tagline}</Text>
          </Section>

          <Section style={style.content}>{children}</Section>

          {footer ?? (
            <Section style={style.footer}>
              <Text style={{ color: color.ink2, fontSize: 12, margin: '0 0 6px' }}>
                {isEn
                  ? 'A question? Just reply to this email, or write to us:'
                  : 'Une question ? Répondez à cet email ou écrivez-nous :'}
              </Text>
              <Link href="mailto:contact@3beestudio.fr" style={{ ...style.link, fontSize: 13 }}>
                contact@3beestudio.fr
              </Link>
              <Text style={{ color: color.ink3, fontSize: 11, margin: '14px 0 0', fontFamily: font.mono }}>
                3BeeStudio · {isEn ? '3D printing studio' : 'Studio d’impression 3D'} · France
              </Text>
            </Section>
          )}
        </Container>
      </Body>
    </Html>
  )
}

/**
 * Pied de page des notifications internes : pas de « contactez-nous », mais un
 * rappel que répondre à l'email écrit directement au client (les notifications
 * internes posent `replyTo` sur son adresse).
 */
export function InternalFooter({ note }: { note?: string }) {
  return (
    <Section style={style.footer}>
      <Text style={{ color: color.ink3, fontSize: 11, margin: 0, fontFamily: font.mono }}>
        3BeeStudio · Notification interne
      </Text>
      {note && (
        <Text style={{ color: color.ink3, fontSize: 11, margin: '6px 0 0' }}>{note}</Text>
      )}
    </Section>
  )
}

/** Bandeau d'ouverture : pastille, titre, phrase d'accroche. */
export function Hero({
  eyebrow,
  title,
  lead,
  align = 'center',
}: {
  eyebrow?: string
  title: React.ReactNode
  lead?: React.ReactNode
  align?: 'center' | 'left'
}) {
  return (
    <Section style={{ textAlign: align, marginBottom: 28 }}>
      {eyebrow && <Text style={style.eyebrow}>{eyebrow}</Text>}
      <Text style={style.title}>{title}</Text>
      {lead && <Text style={style.lead}>{lead}</Text>}
    </Section>
  )
}

export function Card({
  title,
  tone = 'neutral',
  children,
}: {
  title?: string
  tone?: 'neutral' | 'amber' | 'positive'
  children: React.ReactNode
}) {
  const toned =
    tone === 'amber'
      ? { backgroundColor: color.amberTint, border: `1px solid ${color.amberLine}` }
      : tone === 'positive'
        ? { backgroundColor: color.positiveTint, border: `1px solid ${color.positiveLine}` }
        : {}

  return (
    <Section style={{ ...style.card, ...toned }}>
      {title && <Text style={style.cardTitle}>{title}</Text>}
      {children}
    </Section>
  )
}

/** Enveloppe de `InfoRow` — les tables restent la seule mise en page fiable. */
export function InfoTable({ children }: { children: React.ReactNode }) {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: 'collapse' }}>
      <tbody>{children}</tbody>
    </table>
  )
}

export function InfoRow({
  label,
  value,
  mono,
  accent,
  last,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  accent?: boolean
  last?: boolean
}) {
  return (
    <tr>
      <td style={{ paddingBottom: last ? 0 : 9, paddingRight: 14, width: '42%', verticalAlign: 'top' }}>
        <Text style={style.label}>{label}</Text>
      </td>
      <td style={{ paddingBottom: last ? 0 : 9, verticalAlign: 'top' }}>
        <Text
          style={{
            ...style.value,
            ...(mono ? { fontFamily: font.mono } : {}),
            ...(accent ? { color: color.amberDeep } : {}),
          }}
        >
          {value}
        </Text>
      </td>
    </tr>
  )
}

/**
 * Bouton d'action. `url` s'affiche dessous en clair : les clients qui bloquent
 * ou dégradent les liens laissent au moins l'adresse copiable.
 */
export function Button({
  href,
  children,
  showUrl = true,
}: {
  href: string
  children: React.ReactNode
  showUrl?: boolean
}) {
  return (
    <Section style={{ textAlign: 'center', margin: '4px 0 24px' }}>
      <Link href={href} style={style.button}>
        {children}
      </Link>
      {showUrl && <Text style={style.urlHint}>{href}</Text>}
    </Section>
  )
}

/** Étapes numérotées (« prochaines étapes »). */
export function Steps({ items }: { items: Array<{ title: string; desc: string }> }) {
  return (
    <>
      {items.map((step, index) => (
        <table
          key={step.title}
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ borderCollapse: 'collapse', marginBottom: index === items.length - 1 ? 0 : 14 }}
        >
          <tbody>
            <tr>
              <td style={{ width: 30, verticalAlign: 'top', paddingTop: 1 }}>
                <Text style={{ color: color.amberDeep, fontSize: 12, fontFamily: font.mono, fontWeight: 700, margin: 0 }}>
                  {String(index + 1).padStart(2, '0')}
                </Text>
              </td>
              <td>
                <Text style={{ color: color.ink0, fontSize: 13, fontWeight: 700, margin: '0 0 2px' }}>{step.title}</Text>
                <Text style={{ color: color.ink2, fontSize: 12, lineHeight: '1.55', margin: 0 }}>{step.desc}</Text>
              </td>
            </tr>
          </tbody>
        </table>
      ))}
    </>
  )
}

/**
 * Pastille colorée — sert aux notifications internes à faire ressortir en un
 * coup d'œil l'action à mener (expédier, rien à faire…).
 */
const PILL_TONES = {
  amber:    { bg: color.amberTint,     border: color.amberLine,  text: color.amberDeep },
  positive: { bg: color.positiveTint,  border: color.positiveLine, text: color.positive },
  info:     { bg: '#EFF6FF',           border: '#BFDBFE',        text: '#1D4ED8' },
  cyan:     { bg: '#ECFEFF',           border: '#A5F3FC',        text: '#0E7490' },
} as const

export function Pill({
  children,
  tone = 'amber',
}: {
  children: React.ReactNode
  tone?: keyof typeof PILL_TONES
}) {
  const t = PILL_TONES[tone]
  return (
    <Text
      style={{
        display: 'inline-block',
        backgroundColor: t.bg,
        border: `1px solid ${t.border}`,
        color: t.text,
        borderRadius: 999,
        padding: '6px 14px',
        fontSize: 12,
        fontWeight: 600,
        margin: 0,
      }}
    >
      {children}
    </Text>
  )
}

/** Ligne de total, avec une variante mise en avant pour le montant final. */
export function TotalRow({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <tr>
      <td style={{ paddingTop: strong ? 10 : 0, paddingBottom: strong ? 0 : 8 }}>
        <Text
          style={{
            color: strong ? color.ink0 : color.ink2,
            fontSize: strong ? 14 : 13,
            fontWeight: strong ? 700 : 400,
            margin: 0,
          }}
        >
          {label}
        </Text>
      </td>
      <td style={{ textAlign: 'right', width: 110, whiteSpace: 'nowrap', paddingTop: strong ? 10 : 0, paddingBottom: strong ? 0 : 8 }}>
        <Text
          style={{
            color: strong ? color.amberDeep : color.ink0,
            fontSize: strong ? 17 : 13,
            fontWeight: strong ? 800 : 600,
            fontFamily: font.mono,
            whiteSpace: 'nowrap',
            margin: 0,
          }}
        >
          {value}
        </Text>
      </td>
    </tr>
  )
}

/** Encadré d'appui : rappel, avertissement, mention légale. */
export function Note({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'amber'
}) {
  return (
    <Text
      style={{
        color: tone === 'amber' ? color.amberDeep : color.ink2,
        fontSize: 12,
        lineHeight: '1.6',
        margin: '0 0 20px',
      }}
    >
      {children}
    </Text>
  )
}

export function Divider() {
  return (
    <Section style={{ borderTop: `1px solid ${color.line}`, margin: '4px 0 22px', fontSize: 0, lineHeight: 0 }}>
      {' '}
    </Section>
  )
}
