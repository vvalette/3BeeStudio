interface HexLogoProps {
  size?: number
}

export default function HexLogo({ size = 32 }: HexLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="hl-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FCD34D" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <path
        d="M16 2 L28 9 L28 23 L16 30 L4 23 L4 9 Z"
        stroke="url(#hl-grad)"
        strokeWidth="1.4"
        fill="rgba(245,158,11,0.06)"
      />
      <path
        d="M16 8 L22 11.5 L22 18.5 L16 22 L10 18.5 L10 11.5 Z"
        stroke="url(#hl-grad)"
        strokeWidth="1"
        fill="none"
        opacity="0.7"
      />
      <circle cx="16" cy="15" r="1.6" fill="#FBBF24" />
      <line
        x1="16" y1="2" x2="16" y2="30"
        stroke="rgba(245,158,11,0.3)"
        strokeWidth="0.5"
        strokeDasharray="1 2"
      />
    </svg>
  )
}
