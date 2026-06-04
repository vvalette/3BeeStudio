type GlyphKind = 'vase' | 'lamp' | 'chess' | 'planter' | 'speaker' | 'default'

interface ProductGlyphProps {
  kind?: GlyphKind
  tone?: 'amber' | 'neutral'
}

export default function ProductGlyph({ kind = 'default', tone = 'neutral' }: ProductGlyphProps) {
  const stroke = tone === 'amber' ? '#F59E0B' : '#C9C9CE'
  const glow   = tone === 'amber' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'

  if (kind === 'vase') return (
    <svg viewBox="0 0 120 140" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <ellipse cx="60" cy="125" rx="28" ry="4" fill={glow} />
      <path d="M45 22 L75 22 L72 38 Q88 60 86 95 Q84 122 60 124 Q36 122 34 95 Q32 60 48 38 Z" fill="none" stroke={stroke} strokeWidth="1.2" />
      <path d="M45 22 L75 22 L72 38 L48 38 Z" fill={glow} stroke={stroke} strokeWidth="0.8" />
      <path d="M48 38 Q40 70 60 124 Q80 70 72 38" stroke={stroke} strokeWidth="0.5" fill="none" opacity="0.5" />
    </svg>
  )

  if (kind === 'lamp') return (
    <svg viewBox="0 0 120 140" width="100%" height="100%" aria-hidden>
      <ellipse cx="60" cy="128" rx="22" ry="3" fill={glow} />
      <path d="M40 40 L80 40 L70 95 L50 95 Z" fill={glow} stroke={stroke} strokeWidth="1.2" />
      <path d="M50 95 L70 95 L66 110 L54 110 Z" fill="none" stroke={stroke} strokeWidth="1" />
      <rect x="56" y="110" width="8" height="16" fill="none" stroke={stroke} strokeWidth="1" />
      <path d="M40 40 L60 25 L80 40" stroke={stroke} strokeWidth="1" fill="none" />
      <circle cx="60" cy="65" r="2" fill="#FBBF24" />
    </svg>
  )

  if (kind === 'chess') return (
    <svg viewBox="0 0 120 140" width="100%" height="100%" aria-hidden>
      <ellipse cx="60" cy="128" rx="22" ry="3" fill={glow} />
      <path d="M44 120 L76 120 L72 110 L60 80 L48 110 Z" fill="none" stroke={stroke} strokeWidth="1.2" />
      <path d="M52 70 L68 70 L60 50 Z" fill={glow} stroke={stroke} strokeWidth="1" />
      <circle cx="60" cy="42" r="6" fill="none" stroke={stroke} strokeWidth="1" />
      <path d="M48 110 L72 110" stroke={stroke} strokeWidth="0.6" />
    </svg>
  )

  if (kind === 'planter') return (
    <svg viewBox="0 0 120 140" width="100%" height="100%" aria-hidden>
      <ellipse cx="60" cy="128" rx="26" ry="3" fill={glow} />
      <path d="M35 70 L85 70 L78 124 L42 124 Z" fill={glow} stroke={stroke} strokeWidth="1.2" />
      <path d="M35 70 L60 55 L85 70" stroke={stroke} strokeWidth="0.8" fill="none" />
      <path d="M60 55 Q50 35 40 30 M60 55 Q70 35 80 30 M60 55 L60 25" stroke={stroke} strokeWidth="1" fill="none" />
    </svg>
  )

  if (kind === 'speaker') return (
    <svg viewBox="0 0 120 140" width="100%" height="100%" aria-hidden>
      <rect x="35" y="30" width="50" height="92" rx="8" fill={glow} stroke={stroke} strokeWidth="1.2" />
      <circle cx="60" cy="55" r="10" fill="none" stroke={stroke} strokeWidth="1" />
      <circle cx="60" cy="55" r="5"  fill="none" stroke={stroke} strokeWidth="0.6" />
      <circle cx="60" cy="90" r="14" fill="none" stroke={stroke} strokeWidth="1" />
      <circle cx="60" cy="90" r="9"  fill="none" stroke={stroke} strokeWidth="0.6" />
      <circle cx="60" cy="90" r="3"  fill="#FBBF24" />
    </svg>
  )

  return (
    <svg viewBox="0 0 120 140" width="100%" height="100%" aria-hidden>
      <ellipse cx="60" cy="128" rx="22" ry="3" fill={glow} />
      <polygon points="60,30 88,52 78,108 42,108 32,52" fill={glow} stroke={stroke} strokeWidth="1.2" />
      <polygon points="60,30 88,52 60,68 32,52" fill="none" stroke={stroke} strokeWidth="0.6" opacity="0.6" />
      <polygon points="60,68 78,108 42,108" fill="none" stroke={stroke} strokeWidth="0.6" opacity="0.6" />
    </svg>
  )
}
