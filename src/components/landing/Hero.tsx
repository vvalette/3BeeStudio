import Link from 'next/link'
import Image from 'next/image'
import Eyebrow from '@/components/ui/Eyebrow'
import StatusDot from '@/components/ui/StatusDot'

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 7H11M11 7L7 3M11 7L7 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 10 10" fill="#FBBF24" aria-hidden>
      <path d="M5 0 L6.18 3.64 H10 L6.91 5.89 L8.09 9.53 L5 7.28 L1.91 9.53 L3.09 5.89 L0 3.64 H3.82 Z" />
    </svg>
  )
}


export default function Hero() {
  return (
    <section className="hex-bg relative overflow-hidden">
      {/* Honey glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: -200, left: '50%', transform: 'translateX(-50%)',
          width: 900, height: 900, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.16), transparent 60%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Hex grid pattern */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.18]">
        <defs>
          <pattern id="hero-hex" x="0" y="0" width="48" height="56" patternUnits="userSpaceOnUse">
            <path d="M24 1 L46 13 L46 39 L24 51 L2 39 L2 13 Z" fill="none" stroke="rgba(245,158,11,0.18)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-hex)" />
      </svg>

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8 min-h-screen pt-[88px] pb-16 lg:min-h-screen lg:pt-[72px] lg:pb-0">

          {/* ─── Left: copy ─── */}
          <div className="max-w-2xl">
            <h1
              className="fade-up font-sans font-extrabold text-ink-0"
              style={{
                fontSize: 'clamp(2rem, 3vw, 3.2rem)',
                lineHeight: 0.97,
                letterSpacing: '-0.04em',
              }}
            >
              Impression <span className="honey-text pr-1">3D</span>,<br />
              imaginée et<br />
              imprimée en France.
            </h1>

            <p
              className="fade-up mt-7 text-ink-1"
              style={{ fontSize: 'clamp(1.05rem, 1.6vw, 1.3rem)', lineHeight: 1.55, maxWidth: 500 }}
            >
              Pièces uniques, séries limitées et porte-clés connectés personnalisés.
            </p>

            {/* CTAs */}
            <div className="fade-up mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/boutique"
                className="flex h-[60px] items-center justify-center gap-2 rounded-pill px-10 font-sans font-semibold text-[16px] text-[#1A1300] transition-all active:scale-[0.97] hover:brightness-105"
                style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
              >
                Explorer la boutique <ArrowIcon />
              </Link>
              <Link
                href="/sur-mesure"
                className="flex h-[60px] items-center justify-center rounded-pill px-10 font-sans font-semibold text-[16px] text-ink-0 border border-[var(--line-2)] bg-bg-3 transition-all active:scale-[0.97] hover:bg-bg-4"
              >
                Lancer un projet sur mesure
              </Link>
            </div>

            {/* Trust strip */}
            <div
              className="fade-up mt-10 inline-flex items-center gap-5 rounded-md border border-[var(--line)] p-5"
              style={{ background: 'rgba(20,20,24,0.6)', backdropFilter: 'blur(12px)', borderRadius: 20 }}
            >
              <div className="flex flex-shrink-0">
                {(['#3F2E1A', '#7C5410', '#F59E0B', '#FBBF24'] as const).map((color, i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-bg-0 flex-shrink-0"
                    style={{ background: color, marginLeft: i ? -9 : 0 }}
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex gap-0.5 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => <StarIcon key={i} />)}
                </div>
                <div className="font-sans text-ink-1" style={{ fontSize: 13 }}>
                  4.9 · <span className="font-mono">2 400+</span> objets livrés
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 pl-3 border-l border-[var(--line)]">
                <StatusDot />
                <span className="font-mono text-ink-2" style={{ fontSize: 11, letterSpacing: '0.05em' }}>
                  ATELIER OUVERT
                </span>
              </div>
            </div>
          </div>

          {/* ─── Right: logo showcase ─── */}
          <div className="relative hidden lg:flex items-center justify-center">
            <div className="relative" style={{ width: 540, height: 540 }}>
              {/* Concentric glow rings */}
              <div
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{ background: 'radial-gradient(circle at 50% 54%, rgba(245,158,11,0.24), transparent 80%)', filter: 'blur(30px)' }}
              />
              <div aria-hidden className="absolute rounded-full border border-[var(--line-amber)]" style={{ inset: 40 }} />
              <div aria-hidden className="absolute rounded-full border border-[var(--line)]" style={{ inset: 90 }} />

              {/* Logo — l'abeille imprime « 3BeeStudio » couche par couche, puis flottement */}
              <div className="absolute inset-0 flex items-center justify-center" style={{ animation: 'float 6s 1.9s ease-in-out infinite' }}>
                <div className="relative" style={{ width: 420, height: 420 }}>
                  {/* Tête d'impression : abeille + buse balaient ensemble de gauche à droite */}
                  <div
                    className="absolute inset-0"
                    style={{ animation: 'bee-sweep 1.4s 0.4s ease-in-out both' }}
                  >
                    {/* Abeille + buse + plateau (haut 66%, toujours visible) */}
                    <Image
                      src="/images/logo.png"
                      alt="3BeeStudio — logo abeille"
                      width={420}
                      height={420}
                      priority
                      className="absolute inset-0 object-contain mix-blend-lighten"
                      style={{ clipPath: 'inset(0 0 36.2% 0)' }}
                    />
                    {/* Buse — point lumineux qui pulse pendant l'impression */}
                    <div
                      aria-hidden
                      className="absolute pointer-events-none rounded-full"
                      style={{
                        left: '50%', top: '63%', width: 6, height: 6, transform: 'translate(-50%,-50%)',
                        background: 'var(--amber)', boxShadow: '0 0 10px 2px rgba(245,158,11,0.7)',
                        animation: 'nozzle-pulse 0.47s 0.4s ease-in-out 3',
                      }}
                    />
                  </div>
                  {/* Texte « 3BeeStudio » — se construit de haut en bas, par couches */}
                  <Image
                    src="/images/logo.png"
                    alt=""
                    aria-hidden
                    width={420}
                    height={420}
                    className="absolute inset-0 object-contain mix-blend-lighten"
                    style={{ animation: 'print-text-up 1.4s 0.4s steps(6, end) both' }}
                  />
                  {/* Bord de couche lumineux qui descend pendant la construction */}
                  <div
                    aria-hidden
                    className="absolute pointer-events-none z-10"
                    style={{
                      left: '17.5%', right: '17.3%', height: 2,
                      background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.95), transparent)',
                      boxShadow: '0 0 14px 3px rgba(245,158,11,0.55)',
                      animation: 'layer-head 1.4s 0.4s steps(6, end) both',
                    }}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
