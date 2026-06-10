import Link from 'next/link'
import Eyebrow from '@/components/ui/Eyebrow'
import Reveal from '@/components/ui/Reveal'

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 7H11M11 7L7 3M11 7L7 11" stroke="#1A1300" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const stats = [
  { value: '∞',    label: 'IMAGINATION' },
  { value: '48h',  label: 'DEVIS' },
  { value: '7j',   label: 'PROTOTYPE' },
  { value: '5–7j', label: 'LIVRAISON' },
] as const

const steps = [
  {
    n: '01',
    title: "Le studio vous écoute",
    desc: "Pas de formulaire à rallonge — une conversation directe avec l'artisan. Premier rendu 3D en main sous 48h.",
  },
  {
    n: '02',
    title: 'Prototype & itération',
    desc: "Impression test, photos détaillées, retours. On affine jusqu'à la pièce parfaite.",
  },
  {
    n: '03',
    title: 'Production & livraison',
    desc: "Production en série courte ou pièce unique. Expédié sous 5–7 jours en France.",
  },
] as const

export default function CustomCTA() {
  return (
    <section className="py-20 lg:py-28 border-t border-[var(--line)]" style={{ background: 'var(--bg-1)' }}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
        <div
          className="relative overflow-hidden"
          style={{ borderRadius: 32, background: 'linear-gradient(160deg, #2A1C08 0%, #100A02 60%)', border: '1px solid var(--line-amber)' }}
        >
          {/* Hex wireframe deco */}
          <svg aria-hidden className="absolute pointer-events-none" style={{ right: -40, top: -60, opacity: 0.4 }} width="420" height="420" viewBox="0 0 240 240">
            <defs>
              <linearGradient id="cta-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FBBF24" stopOpacity="0.6" />
                <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M120 20 L200 60 L200 140 L120 180 L40 140 L40 60 Z" fill="none" stroke="url(#cta-grad)" strokeWidth="0.8" />
            <path d="M120 50 L175 78 L175 132 L120 160 L65 132 L65 78 Z" fill="none" stroke="url(#cta-grad)" strokeWidth="0.6" />
            <path d="M120 80 L150 96 L150 124 L120 140 L90 124 L90 96 Z" fill="none" stroke="url(#cta-grad)" strokeWidth="0.4" />
            <circle cx="120" cy="20" r="2" fill="#F59E0B" />
            <circle cx="200" cy="60" r="2" fill="#F59E0B" />
            <circle cx="40"  cy="60" r="2" fill="#F59E0B" />
          </svg>

          {/* ── Top: CTA content ── */}
          <div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:items-center lg:gap-16 lg:p-16 pb-10 lg:pb-12">
            {/* Left */}
            <div>
              <div className="mb-6">
                <Eyebrow>Sur-mesure</Eyebrow>
              </div>

              <h2
                className="mb-4 font-sans font-bold text-ink-0"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', lineHeight: 1.0, letterSpacing: '-0.03em' }}
              >
                Une idée?<br />
                <span className="honey-text">On la fabrique.</span>
              </h2>

              <p className="mb-8 text-[rgba(250,250,250,0.75)]" style={{ fontSize: 'clamp(1rem, 1.3vw, 1.1rem)', lineHeight: 1.55, maxWidth: 420 }}>
                Cadeau personnalisé, prototype produit, pièces mécanique, réparation d'objets cassés etc...
                <br />Devis sous 48h, prototype sous 7 jours.
              </p>

              <Link
                href="/sur-mesure"
                className="inline-flex h-[54px] items-center justify-center gap-2 rounded-pill px-8 font-sans font-semibold text-[15px] text-[#1A1300] transition-all active:scale-[0.97] hover:brightness-105"
                style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
              >
                Décrire mon projet <ArrowIcon />
              </Link>
            </div>

            {/* Right: stats */}
            <div className="grid grid-cols-2 gap-px overflow-hidden" style={{ borderRadius: 20, background: 'var(--line-amber)' }}>
              {stats.map(({ value, label }) => (
                <div key={label} className="px-6 py-8 lg:py-10" style={{ background: '#0E0801' }}>
                  <div
                    className="font-sans font-bold text-amber-soft"
                    style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', lineHeight: 1, transform: value === '∞' ? 'scale(1.6)' : 'none', transformOrigin: 'left center' }}
                  >
                    {value}
                  </div>
                  <div className="font-mono text-ink-2 mt-2" style={{ fontSize: 11, letterSpacing: '0.06em' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Separator */}
          <div className="mx-8 sm:mx-12 lg:mx-16 h-px" style={{ background: 'var(--line-amber)' }} />

          {/* ── Bottom: timeline ── */}
          <div className="relative p-8 sm:p-12 lg:p-16 pt-10 lg:pt-12">
            <div className="grid gap-8 lg:grid-cols-3 lg:gap-8 relative">
              {/* Horizontal connector (desktop) */}
              <div
                aria-hidden
                className="hidden lg:block absolute left-0 right-0 top-6 h-px"
                style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.4), rgba(245,158,11,0.4) 66%, transparent)' }}
              />

              {steps.map((step, i) => (
                <div key={step.n} className="relative flex gap-4 lg:flex-col lg:gap-0">
                  <div className="relative flex flex-col items-center lg:items-start lg:mb-5">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-sm font-mono font-bold text-[#1A1300] flex-shrink-0"
                      style={{ borderRadius: 14, fontSize: 17, background: 'linear-gradient(180deg, #FBBF24, #B45309)', boxShadow: '0 8px 20px rgba(245,158,11,0.3)' }}
                    >
                      {step.n}
                    </div>
                    {i < steps.length - 1 && (
                      <div className="lg:hidden flex-1 mt-2 w-px" style={{ background: 'linear-gradient(180deg, rgba(245,158,11,0.4), transparent)' }} />
                    )}
                  </div>
                  <div className="pt-1.5 lg:pt-0 flex-1">
                    <h4 className="font-sans font-semibold text-ink-0 mb-2" style={{ fontSize: 18, lineHeight: 1.2, letterSpacing: '-0.015em' }}>
                      {step.title}
                    </h4>
                    <p className="text-[rgba(250,250,250,0.65)]" style={{ fontSize: 14, lineHeight: 1.55 }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </Reveal>
      </div>
    </section>
  )
}
