/**
 * Icône de la destination programmée sur une puce NFC, déduite de la valeur
 * stockée (URL ou vCard). Sert au suivi client et à l'admin des commandes NFC
 * passées : le parcours de commande en ligne a été retiré, les commandes
 * existantes restent consultables.
 */

type Destination = 'instagram' | 'tiktok' | 'linkedin' | 'contact' | 'website'

function destinationType(value: string): Destination {
  if (value.startsWith('BEGIN:VCARD')) return 'contact'
  try {
    const host = new URL(value).hostname.replace(/^www\./, '')
    if (host.includes('instagram.com')) return 'instagram'
    if (host.includes('tiktok.com'))    return 'tiktok'
    if (host.includes('linkedin.com'))  return 'linkedin'
  } catch {
    // Valeur qui n'est pas une URL : traitée comme un site
  }
  return 'website'
}

function IgIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TtIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 3c.3 2 1.6 3.6 3.5 3.9v2.4c-1.3.1-2.5-.2-3.5-.8v5.8c0 3.3-2.4 5.7-5.5 5.7S6 17.6 6 14.5s2.6-5.6 5.7-5.2v2.5c-.4-.1-.8-.2-1.2-.2-1.5 0-2.6 1.2-2.6 2.7s1.1 2.7 2.6 2.7 2.6-1.2 2.6-2.7V3h3.4z" />
    </svg>
  )
}

function LiIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.5 3.5a2 2 0 100 4 2 2 0 000-4zM3 9h3v12H3V9zm6 0h2.9v1.6h.04c.4-.75 1.4-1.6 2.96-1.6 3.16 0 3.74 2 3.74 4.7V21h-3v-5.6c0-1.3-.02-3-1.85-3-1.85 0-2.13 1.4-2.13 2.9V21H9V9z" />
    </svg>
  )
}

function GlobeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  )
}

function ContactIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="2" />
      <path d="M5.5 16c.6-1.8 2-2.5 3.5-2.5s2.9.7 3.5 2.5" />
      <path d="M15 9h4M15 12h4M15 15h2" />
    </svg>
  )
}

// Icône de la destination NFC (récap, suivi…) — déduite de la valeur stockée.

export default function DestinationIcon({ value, size = 14 }: { value: string; size?: number }) {
  switch (destinationType(value)) {
    case 'instagram': return <IgIcon size={size} />
    case 'tiktok':    return <TtIcon size={size} />
    case 'linkedin':  return <LiIcon size={size} />
    case 'contact':   return <ContactIcon size={size} />
    default:          return <GlobeIcon size={size} />
  }
}
