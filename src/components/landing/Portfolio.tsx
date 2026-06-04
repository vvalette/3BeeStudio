import Link from 'next/link'
import Eyebrow from '@/components/ui/Eyebrow'

interface Tile {
  label: string
  kind: string
  accent?: boolean
  span: string
  index: number
}

const TILES: Omit<Tile, 'index'>[] = [
  { label: 'Lampe Hexalux',   kind: 'CUSTOM', accent: true,  span: 'col-span-2 row-span-2 lg:col-span-2 lg:row-span-2' },
  { label: 'Trophée Eldur',   kind: 'SHOP',                  span: 'col-span-1 row-span-1' },
  { label: 'Maison Bouchet',  kind: 'CUSTOM',                span: 'col-span-1 row-span-1' },
  { label: 'Capsule Studio R', kind: 'SHOP', accent: true,   span: 'col-span-2 row-span-1 lg:col-span-3 lg:row-span-1' },
]

function PortfolioTile({ label, kind, accent = false, span, index }: Tile) {
  const patternId = `ptile-${index}`
  return (
    <div
      className={`group relative overflow-hidden flex flex-col justify-end p-5 transition-all duration-300 hover:-translate-y-1 ${span}`}
      style={{
        borderRadius: 24,
        background: accent ? 'linear-gradient(160deg, #2A1C08, #0E0801)' : 'linear-gradient(160deg, #1A1A1F, #08080A)',
        border: accent ? '1px solid var(--line-amber)' : '1px solid var(--line)',
      }}
    >
      <svg aria-hidden className="absolute inset-0 w-full h-full transition-opacity group-hover:opacity-60" style={{ opacity: 0.4 }}>
        <defs>
          <pattern id={patternId} width="22" height="26" patternUnits="userSpaceOnUse">
            <path d="M11 2 L20 24 L2 24 Z" fill="none" stroke={accent ? 'rgba(245,158,11,0.5)' : 'rgba(255,255,255,0.08)'} strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      <div className="absolute top-4 right-4">
        <div className="font-mono text-ink-1 px-2 py-1 rounded-full border border-[rgba(255,255,255,0.1)]" style={{ fontSize: 9, letterSpacing: '0.08em', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          {kind}
        </div>
      </div>

      <div className="relative">
        <div className="text-[15px] font-semibold text-ink-0">{label}</div>
        <div className="font-mono text-ink-2 mt-1" style={{ fontSize: 10, letterSpacing: '0.05em' }}>2025 · COMMANDE</div>
      </div>
    </div>
  )
}

export default function Portfolio() {
  return (
    <section className="py-20 lg:py-28 border-t border-[var(--line)]" style={{ background: 'var(--bg-1)' }}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="mb-3"><Eyebrow>Portfolio</Eyebrow></div>
            <h2 className="font-sans font-bold text-ink-0" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
              Projets récents.
            </h2>
          </div>
          <Link href="/portfolio" className="font-mono text-amber whitespace-nowrap hover:text-amber-soft transition-colors" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
            TOUT VOIR →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5 auto-rows-[150px] lg:auto-rows-[210px]">
          {TILES.map((t, i) => <PortfolioTile key={t.label} {...t} index={i} />)}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/portfolio"
            className="flex h-[54px] items-center justify-center rounded-pill px-10 font-sans font-semibold text-[15px] text-ink-0 border border-[var(--line-2)] bg-bg-3 transition-all active:scale-[0.97] hover:bg-bg-4"
          >
            Explorer le portfolio
          </Link>
        </div>
      </div>
    </section>
  )
}
