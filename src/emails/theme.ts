/**
 * Jetons de style des emails transactionnels.
 *
 * Repris de `src/styles/globals.css` (thème clair, celui du site par défaut) —
 * avant ça, chaque template redéfinissait sa propre palette sombre et les
 * emails ne ressemblaient plus au site.
 *
 * Toutes les couleurs sont en hexadécimal opaque : `rgba()` est mal composé par
 * plusieurs clients (Outlook desktop en tête), et un fond translucide y vire au
 * noir. Les valeurs « tint » sont donc les équivalents aplatis sur blanc.
 */

export const color = {
  /** Fond de la page, autour du bloc email. */
  page:    '#F4F3F0', // --bg-2
  /** Surface du bloc email. */
  surface: '#FFFFFF', // --bg-0
  /** Cartes internes. */
  card:    '#FAFAF8', // --bg-1

  ink0: '#17171A',
  ink1: '#3F3F46',
  ink2: '#6B6B73',
  ink3: '#A1A1A8',

  amber:     '#F59E0B',
  amberSoft: '#FBBF24',
  amberDeep: '#B45309',
  /** rgba(245,158,11,0.08) aplati sur blanc. */
  amberTint: '#FEF6E7',
  /** rgba(245,158,11,0.30) aplati sur blanc. */
  amberLine: '#FBDCA4',
  /** Texte posé sur un aplat ambre. */
  onAmber: '#1A1300',

  line:  '#E7E5E0',
  line2: '#DBD8D2',

  positive:     '#047857',
  positiveTint: '#ECFDF5',
  positiveLine: '#A7F3D0',
} as const

export const font = {
  sans: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const

/** Largeur du bloc email — au-delà, les lignes deviennent pénibles à lire. */
export const CONTENT_WIDTH = 560

export const style = {
  body: {
    backgroundColor: color.page,
    margin: 0,
    padding: '24px 12px',
    fontFamily: font.sans,
    WebkitFontSmoothing: 'antialiased',
  } as React.CSSProperties,

  container: {
    maxWidth: CONTENT_WIDTH,
    margin: '0 auto',
    backgroundColor: color.surface,
    borderRadius: 16,
    border: `1px solid ${color.line}`,
    overflow: 'hidden',
  } as React.CSSProperties,

  header: {
    backgroundColor: color.amberTint,
    borderBottom: `1px solid ${color.amberLine}`,
    padding: '24px 32px',
    textAlign: 'center',
  } as React.CSSProperties,

  wordmark: {
    fontSize: 21,
    fontWeight: 800,
    color: color.amberDeep,
    margin: 0,
    letterSpacing: '-0.02em',
  } as React.CSSProperties,

  tagline: {
    fontSize: 11,
    color: color.ink2,
    margin: '4px 0 0',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  content: { padding: '32px 32px 8px' } as React.CSSProperties,

  eyebrow: {
    display: 'inline-block',
    backgroundColor: color.amberTint,
    border: `1px solid ${color.amberLine}`,
    borderRadius: 999,
    padding: '5px 14px',
    color: color.amberDeep,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    margin: 0,
  } as React.CSSProperties,

  title: {
    color: color.ink0,
    fontSize: 25,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    lineHeight: '1.15',
    margin: '16px 0 10px',
  } as React.CSSProperties,

  lead: {
    color: color.ink2,
    fontSize: 14,
    lineHeight: '1.65',
    margin: 0,
  } as React.CSSProperties,

  card: {
    backgroundColor: color.card,
    border: `1px solid ${color.line}`,
    borderRadius: 12,
    padding: '18px 20px',
    marginBottom: 16,
  } as React.CSSProperties,

  cardTitle: {
    color: color.ink3,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    margin: '0 0 12px',
  } as React.CSSProperties,

  button: {
    display: 'inline-block',
    backgroundColor: color.amber,
    color: color.onAmber,
    fontSize: 14,
    fontWeight: 700,
    borderRadius: 999,
    padding: '13px 30px',
    textDecoration: 'none',
  } as React.CSSProperties,

  urlHint: {
    color: color.ink3,
    fontSize: 11,
    fontFamily: font.mono,
    margin: '10px 0 0',
    wordBreak: 'break-all',
  } as React.CSSProperties,

  footer: {
    borderTop: `1px solid ${color.line}`,
    backgroundColor: color.card,
    padding: '22px 32px 26px',
    textAlign: 'center',
  } as React.CSSProperties,

  label: { color: color.ink2, fontSize: 12, margin: 0 } as React.CSSProperties,
  value: { color: color.ink0, fontSize: 13, fontWeight: 600, margin: 0 } as React.CSSProperties,
  link:  { color: color.amberDeep, fontWeight: 600, textDecoration: 'none' } as React.CSSProperties,
} as const
