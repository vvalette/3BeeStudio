import { Link } from '@/i18n/navigation'

interface Props {
  href: string
  label: string
  cta: string
}

export default function AnnouncementBanner({ href, label, cta }: Props) {
  return (
    <div
      className="relative w-full overflow-hidden border-y border-[var(--line-amber)]"
      style={{ background: 'var(--banner-bg)' }}
    >
      {/* Subtle shimmer line */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5) 40%, rgba(245,158,11,0.5) 60%, transparent)' }}
      />

      <Link
        href={href}
        className="group flex items-center justify-center gap-3 py-3 px-5 cursor-pointer"
      >
        {/* Pulsing dot */}
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber" />
        </span>

        <span className="font-mono text-[11px] tracking-[0.12em] text-amber-soft uppercase">
          {label}
        </span>

        <span className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] tracking-[0.1em] text-ink-2 uppercase group-hover:text-amber transition-colors">
          <span className="w-px h-3 bg-[var(--line)] mx-1" />
          {cta}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
            <path d="M2 5h6M6 3l2 2-2 2" />
          </svg>
        </span>
      </Link>

      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5) 40%, rgba(245,158,11,0.5) 60%, transparent)' }}
      />
    </div>
  )
}
