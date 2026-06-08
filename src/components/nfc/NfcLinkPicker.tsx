'use client'

import { useState, useEffect } from 'react'
import { NFC_CHIP_BYTE_LIMIT, byteLength } from '@/types/order'

// ─── Types de destination ─────────────────────────────────────────────────────

export type LinkType =
  | 'instagram'
  | 'tiktok'
  | 'linkedin'
  | 'website'
  | 'contact'
  | 'other'

interface TypeConfig {
  id: LinkType
  label: string
  icon: React.ReactNode
  prefix?: string          // adornment texte (réseaux sociaux)
  placeholder: string
  inputType?: string
  help: string[]           // étapes / explications
}

const TYPES: TypeConfig[] = [
  {
    id: 'instagram', label: 'Instagram', prefix: 'instagram.com/', placeholder: 'votrecompte ou URL complète', icon: <IgIcon />,
    help: [
      'Ouvrez l’app Instagram sur votre profil',
      'Touchez le menu ☰ (en haut à droite)',
      '« Partager ce profil » → « Copier le lien »',
      'Collez le lien ici — l’identifiant sera extrait automatiquement',
    ],
  },
  {
    id: 'tiktok', label: 'TikTok', prefix: 'tiktok.com/@', placeholder: 'votrecompte ou URL complète', icon: <TtIcon />,
    help: [
      'Ouvrez votre profil TikTok',
      'Touchez le bouton « Partager » (flèche)',
      '« Copier le lien »',
      'Collez-le ici',
    ],
  },
  {
    id: 'linkedin', label: 'LinkedIn', prefix: 'linkedin.com/in/', placeholder: 'votre-profil ou URL complète', icon: <LiIcon />,
    help: [
      'Ouvrez votre profil LinkedIn',
      'Cliquez sur « Plus » puis « Copier le lien du profil »',
      'Collez-le ici',
    ],
  },
  {
    id: 'website', label: 'Site web', placeholder: 'monsite.fr', icon: <GlobeIcon />,
    help: ['Collez l’adresse complète de votre site (ex : monsite.fr)', 'Pas besoin du https:// — il est ajouté automatiquement'],
  },
  {
    id: 'contact', label: 'Fiche contact', placeholder: '', icon: <ContactIcon />,
    help: [
      'Remplissez le nom et au moins un contact (téléphone ou email)',
      'Au contact du téléphone, une fenêtre « Ajouter aux contacts » s’ouvre',
      'Le client enregistre tout d’un seul geste — zéro saisie, zéro faute de frappe',
    ],
  },
  {
    id: 'other', label: 'Autre lien', placeholder: 'https://...', icon: <LinkIcon />,
    help: ['Collez n’importe quel lien commençant par https://'],
  },
]

interface Contact { firstName: string; lastName: string; phone: string; email: string }

const EMPTY_CONTACT: Contact = { firstName: '', lastName: '', phone: '', email: '' }

// ─── Build & parse ────────────────────────────────────────────────────────────

function buildUrl(type: LinkType, raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  switch (type) {
    case 'instagram': return `https://instagram.com/${v.replace(/^@/, '')}`
    case 'tiktok':    return `https://tiktok.com/@${v.replace(/^@/, '')}`
    case 'linkedin':  return `https://linkedin.com/in/${v.replace(/^\/+/, '')}`
    case 'website':
    case 'other':     return /^https?:\/\//i.test(v) ? v : `https://${v}`
    default:          return ''
  }
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
}

function isValidPhone(p: string): boolean {
  return p.replace(/\D/g, '').length >= 6
}

function buildVCard(c: Contact): string {
  const first = c.firstName.trim()
  const last = c.lastName.trim()
  const phone = c.phone.trim()
  const email = c.email.trim()
  const fn = [first, last].filter(Boolean).join(' ')
  // vCard valide uniquement si : nom présent, au moins un contact, et formats corrects
  if (!last) return ''
  if (phone && !isValidPhone(phone)) return ''
  if (email && !isValidEmail(email)) return ''
  if (!phone && !email) return ''
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${last};${first};;;`,
    `FN:${fn}`,
  ]
  if (phone) lines.push(`TEL;TYPE=CELL:${phone.replace(/[^\d+]/g, '')}`)
  if (email) lines.push(`EMAIL:${email}`)
  lines.push('END:VCARD')
  return lines.join('\n')
}

function buildValue(type: LinkType, raw: string, contact: Contact): string {
  return type === 'contact' ? buildVCard(contact) : buildUrl(type, raw)
}

function parseVCard(v: string): Contact {
  const phone = /TEL[^:]*:(.*)/.exec(v)?.[1]?.trim() ?? ''
  const email = /EMAIL[^:]*:(.*)/.exec(v)?.[1]?.trim() ?? ''
  const n = /\nN:([^\n]*)/.exec(v)?.[1]
  if (n) {
    const [last = '', first = ''] = n.split(';')
    return { firstName: first.trim(), lastName: last.trim(), phone, email }
  }
  // Fallback : pas de N: structuré → on met tout dans le nom
  return { firstName: '', lastName: /FN:(.*)/.exec(v)?.[1]?.trim() ?? '', phone, email }
}

function parseValue(value?: string): { type: LinkType; raw: string; contact: Contact } {
  if (!value) return { type: 'instagram', raw: '', contact: EMPTY_CONTACT }
  if (value.startsWith('BEGIN:VCARD')) return { type: 'contact', raw: '', contact: parseVCard(value) }
  try {
    const u = new URL(value)
    const host = u.hostname.replace(/^www\./, '')
    const path = u.pathname.replace(/^\/+/, '')
    if (host.includes('instagram.com')) return { type: 'instagram', raw: path, contact: EMPTY_CONTACT }
    if (host.includes('tiktok.com'))    return { type: 'tiktok', raw: path.replace(/^@/, ''), contact: EMPTY_CONTACT }
    if (host.includes('linkedin.com'))  return { type: 'linkedin', raw: path.replace(/^in\//, ''), contact: EMPTY_CONTACT }
    return { type: 'website', raw: value, contact: EMPTY_CONTACT }
  } catch {
    return { type: 'website', raw: value, contact: EMPTY_CONTACT }
  }
}

// Extrait l'identifiant si l'utilisateur colle une URL complète
function sanitizeHandle(type: LinkType, input: string): string {
  let v = input.trim()
  if (type === 'website' || type === 'other') return input
  v = v.replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  if (type === 'instagram') v = v.replace(/^instagram\.com\//i, '')
  if (type === 'tiktok') v = v.replace(/^tiktok\.com\//i, '')
  if (type === 'linkedin') v = v.replace(/^linkedin\.com\/in\//i, '').replace(/^linkedin\.com\//i, '')
  v = v.replace(/^@/, '').replace(/\/+$/, '').split(/[/?#]/)[0]
  return v
}

// ─── Composant ────────────────────────────────────────────────────────────────

interface Props {
  value?: string
  onChange: (value: string) => void
  error?: string
}

type VerifyStatus = 'idle' | 'loading' | 'ok' | 'notfound' | 'unknown'

const VERIFIABLE: LinkType[] = ['instagram', 'tiktok', 'website', 'other']

export default function NfcLinkPicker({ value, onChange, error }: Props) {
  const initial = parseValue(value)
  const [type, setType] = useState<LinkType>(initial.type)
  const [raw, setRaw] = useState(initial.raw)
  const [contact, setContact] = useState<Contact>(initial.contact)
  const [verify, setVerify] = useState<VerifyStatus>('idle')
  const [showHelp, setShowHelp] = useState(false)

  const cfg = TYPES.find((t) => t.id === type)!
  const builtValue = buildValue(type, raw, contact)
  const isContact = type === 'contact'

  // Validation de format des champs contact
  const phoneError = isContact && contact.phone.trim() && !isValidPhone(contact.phone)
    ? 'Numéro de téléphone invalide' : undefined
  const emailError = isContact && contact.email.trim() && !isValidEmail(contact.email)
    ? 'Email invalide' : undefined

  function setTypeAndEmit(nextType: LinkType) {
    setType(nextType)
    onChange(buildValue(nextType, nextType === type ? raw : '', nextType === type ? contact : EMPTY_CONTACT))
    if (nextType !== type) {
      if (nextType !== 'contact') setRaw('')
      else setContact(EMPTY_CONTACT)
    }
  }

  function setRawAndEmit(nextRaw: string) {
    setRaw(nextRaw)
    onChange(buildUrl(type, nextRaw))
  }

  function setContactAndEmit(next: Contact) {
    setContact(next)
    onChange(buildVCard(next))
  }

  // Vérification best-effort (uniquement liens web)
  useEffect(() => {
    if (isContact || !raw.trim() || !VERIFIABLE.includes(type)) {
      setVerify('idle')
      return
    }
    const url = buildUrl(type, raw)
    if (!url) { setVerify('idle'); return }

    setVerify('loading')
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/nfc/verify-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, type }),
          signal: ctrl.signal,
        })
        const json = await res.json()
        setVerify(json.status === 'ok' ? 'ok' : json.status === 'notfound' ? 'notfound' : 'unknown')
      } catch {
        setVerify('unknown')
      }
    }, 700)

    return () => { clearTimeout(timer); ctrl.abort() }
  }, [type, raw, isContact])

  return (
    <div className="space-y-3">
      {/* Grille de types */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {TYPES.map((t) => {
          const active = t.id === type
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTypeAndEmit(t.id)}
              className="flex flex-col cursor-pointer items-center gap-1.5 rounded-xl py-3 px-1 transition-all duration-200"
              style={active ? {
                background: 'rgba(245,158,11,0.12)',
                border: '1.5px solid rgba(245,158,11,0.6)',
                boxShadow: '0 0 20px rgba(245,158,11,0.12)',
              } : {
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <span style={{ color: active ? '#F59E0B' : '#87878E' }} className="transition-colors">
                {t.icon}
              </span>
              <span
                className="text-[11px] font-medium transition-colors"
                style={{ color: active ? '#F59E0B' : '#C9C9CE' }}
              >
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Saisie : fiche contact (3 champs) ── */}
      {isContact ? (
        <div className="space-y-3">
          {/* Champs */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <ContactInput
                icon={<UserMini />}
                placeholder="Prénom"
                value={contact.firstName}
                onChange={(v) => setContactAndEmit({ ...contact, firstName: v })}
              />
              <ContactInput
                icon={<UserMini />}
                required
                placeholder="Nom ou entreprise"
                value={contact.lastName}
                onChange={(v) => setContactAndEmit({ ...contact, lastName: v })}
              />
            </div>
            <ContactInput
              icon={<PhoneMini />}
              type="tel"
              placeholder="Téléphone"
              value={contact.phone}
              error={phoneError}
              onChange={(v) => setContactAndEmit({ ...contact, phone: v })}
            />
            <ContactInput
              icon={<MailMini />}
              type="email"
              placeholder="Email"
              value={contact.email}
              error={emailError}
              onChange={(v) => setContactAndEmit({ ...contact, email: v })}
            />
          </div>

          {/* Guidage tant que la fiche n'est pas valide (sans erreur de format affichée) */}
          {!builtValue && !phoneError && !emailError && (
            <p className="text-[11px] text-ink-3">
              Indiquez le nom et au moins un contact — téléphone ou email.
            </p>
          )}

          {builtValue && byteLength(builtValue) > NFC_CHIP_BYTE_LIMIT - 22 && <VCardMeter vcard={builtValue} />}
        </div>
      ) : (
        /* ── Saisie : lien simple ── */
        <div
          className="flex items-center overflow-hidden rounded-xl transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${error ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.08)'}`,
          }}
        >
          {cfg.prefix ? (
            <span className="select-none whitespace-nowrap pl-4 pr-1 font-mono text-sm text-ink-3">
              {cfg.prefix}
            </span>
          ) : (
            <span className="pl-4 text-ink-3">{cfg.icon}</span>
          )}
          <input
            type={cfg.inputType ?? 'text'}
            value={raw}
            onChange={(e) => setRawAndEmit(sanitizeHandle(type, e.target.value))}
            placeholder={cfg.placeholder}
            className={`w-full bg-transparent py-3 text-sm text-ink-0 outline-none placeholder:text-ink-3 ${cfg.prefix ? 'pl-0 pr-4' : 'px-3'}`}
          />
        </div>
      )}

      {/* Aide contextuelle */}
      <div>
        <button
          type="button"
          onClick={() => setShowHelp((s) => !s)}
          className="inline-flex items-center gap-1.5 text-[11px] text-ink-2 transition-colors hover:text-amber"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="7" cy="7" r="6" />
            <path d="M7 10v-.5M7 7.4c0-1 1.2-1.1 1.2-2.1A1.2 1.2 0 007 4.2" strokeLinecap="round" />
          </svg>
          {isContact ? 'Que contient la fiche contact ?' : `Comment récupérer mon lien ${cfg.label} ?`}
          <svg
            width="11" height="11" viewBox="0 0 16 16" fill="none"
            className="transition-transform duration-200"
            style={{ transform: showHelp ? 'rotate(180deg)' : 'none' }}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showHelp && (
          <ol
            className="mt-2 space-y-1.5 rounded-xl p-3.5"
            style={{
              background: 'rgba(245,158,11,0.05)',
              border: '1px solid rgba(245,158,11,0.18)',
              animation: 'fadeUp 160ms cubic-bezier(0.2,0.7,0.2,1) both',
            }}
          >
            {cfg.help.map((step, i) => (
              <li key={i} className="flex gap-2.5 text-[12px] text-ink-1">
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full font-mono text-[9px] font-bold text-amber"
                  style={{ background: 'rgba(245,158,11,0.15)' }}
                >
                  {i + 1}
                </span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Aperçu du lien final (liens web uniquement) */}
      {builtValue && !isContact && (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-ink-3">Lien final :</span>
          <span className="truncate font-mono text-amber/80">{builtValue}</span>
        </div>
      )}

      {/* Vérification (liens web uniquement) */}
      {builtValue && !isContact && <VerifyIndicator status={verify} type={type} />}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ─── Compteur d'octets de la vCard ────────────────────────────────────────────

function VCardMeter({ vcard }: { vcard: string }) {
  const bytes = byteLength(vcard)
  const pct = Math.min(100, (bytes / NFC_CHIP_BYTE_LIMIT) * 100)
  const over = bytes > NFC_CHIP_BYTE_LIMIT
  const near = bytes > NFC_CHIP_BYTE_LIMIT * 0.85
  const color = over ? '#f87171' : near ? '#F59E0B' : '#34d399'

  return (
    <div
      className="space-y-2 rounded-xl p-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-ink-3">Taille sur la puce NFC</span>
        <span className="font-mono font-semibold" style={{ color }}>{bytes} / {NFC_CHIP_BYTE_LIMIT} octets</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
      {over ? (
        <p className="text-[11px] text-red-400">
          Trop d’informations pour la puce. La puce NFC (NTAG213) ne stocke que ~{NFC_CHIP_BYTE_LIMIT} octets :
          raccourcissez le nom, ou ne gardez qu’un seul moyen de contact (téléphone <em>ou</em> email).
        </p>
      ) : (
        <p className="text-[11px] text-ink-3">
          La puce NFC a une mémoire limitée (~{NFC_CHIP_BYTE_LIMIT} octets). Tant que la barre n’est pas pleine, tout rentre.
        </p>
      )}
    </div>
  )
}

// ─── Champ de la fiche contact ────────────────────────────────────────────────

function ContactInput({ icon, value, onChange, placeholder, type = 'text', required, error }: {
  icon: React.ReactNode; value: string; onChange: (v: string) => void
  placeholder: string; type?: string; required?: boolean; error?: string
}) {
  const filled = value.trim().length > 0
  const borderColor = error
    ? 'rgba(248,113,113,0.5)'
    : filled ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'
  return (
    <div>
      <div
        className="flex items-center overflow-hidden rounded-xl transition-colors"
        style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${borderColor}` }}
      >
        <span className="pl-3.5 transition-colors" style={{ color: error ? '#f87171' : filled ? '#F59E0B' : '#54545A' }}>{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-ink-0 outline-none placeholder:text-ink-3"
        />
        {required && !filled && !error && (
          <span className="shrink-0 pr-3.5 font-mono text-[10px] uppercase tracking-wider text-amber/60">requis</span>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  )
}

// ─── Indicateur de vérification ───────────────────────────────────────────────

function VerifyIndicator({ status, type }: { status: VerifyStatus; type: LinkType }) {
  if (status === 'idle') return null
  const isWebsite = type === 'website' || type === 'other'

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="14" strokeLinecap="round" />
        </svg>
        Vérification…
      </div>
    )
  }
  if (status === 'ok') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {isWebsite ? 'Site accessible' : 'Compte trouvé'}
      </div>
    )
  }
  if (status === 'notfound') {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-amber">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 1L13 12H1L7 1Z" strokeLinejoin="round" />
          <path d="M7 5.5V8" strokeLinecap="round" />
          <circle cx="7" cy="10" r="0.6" fill="currentColor" stroke="none" />
        </svg>
        {isWebsite ? 'Site introuvable — vérifiez l’adresse' : 'Compte introuvable — vérifiez l’identifiant'}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="7" r="6" />
        <path d="M7 10v-.5M7 7.5c0-1 1.2-1.2 1.2-2.2A1.2 1.2 0 007 4.1" strokeLinecap="round" />
      </svg>
      Vérification automatique impossible
    </div>
  )
}

// ─── Icônes plateformes ───────────────────────────────────────────────────────

function IgIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function TtIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.5 3c.3 2 1.6 3.6 3.5 3.9v2.4c-1.3.1-2.5-.2-3.5-.8v5.8c0 3.3-2.4 5.7-5.5 5.7S6 17.6 6 14.5s2.6-5.6 5.7-5.2v2.5c-.4-.1-.8-.2-1.2-.2-1.5 0-2.6 1.2-2.6 2.7s1.1 2.7 2.6 2.7 2.6-1.2 2.6-2.7V3h3.4z" />
    </svg>
  )
}

function LiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.5 3.5a2 2 0 100 4 2 2 0 000-4zM3 9h3v12H3V9zm6 0h2.9v1.6h.04c.4-.75 1.4-1.6 2.96-1.6 3.16 0 3.74 2 3.74 4.7V21h-3v-5.6c0-1.3-.02-3-1.85-3-1.85 0-2.13 1.4-2.13 2.9V21H9V9z" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  )
}

function ContactIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="2" />
      <path d="M5.5 16c.6-1.8 2-2.5 3.5-2.5s2.9.7 3.5 2.5" />
      <path d="M15 9h4M15 12h4M15 15h2" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 13a3 3 0 004 0l3-3a3 3 0 00-4-4l-1 1" />
      <path d="M13 11a3 3 0 00-4 0l-3 3a3 3 0 004 4l1-1" />
    </svg>
  )
}

// ─── Mini-icônes (champs contact) ─────────────────────────────────────────────

function UserMini() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="2.5" />
      <path d="M3 13c.8-2.4 2.7-3.3 5-3.3s4.2.9 5 3.3" />
    </svg>
  )
}

function PhoneMini() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 2.5h2l1.3 3.3-1.6 1a7 7 0 003.3 3.3l1-1.6 3.3 1.3v2a1.3 1.3 0 01-1.3 1.3A10.7 10.7 0 012.2 3.8 1.3 1.3 0 013.5 2.5z" />
    </svg>
  )
}

function MailMini() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="M2 5l6 4 6-4" />
    </svg>
  )
}
