import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Eyebrow from '@/components/ui/Eyebrow'
import Reveal from '@/components/ui/Reveal'

export default function Portfolio() {
  const t = useTranslations('portfolioSection')
  return (
    <section className="py-20 lg:py-28 border-t border-[var(--line)]" style={{ background: 'var(--bg-1)' }}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="flex items-end justify-between mb-8">
          <div>
            <div className="mb-3"><Eyebrow>{t('eyebrow')}</Eyebrow></div>
            <h2 className="font-sans font-bold text-ink-0" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
              {t('heading')}
            </h2>
          </div>
          <Link href="/portfolio" className="font-mono text-amber whitespace-nowrap hover:text-amber-soft transition-colors" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
            {t('viewAll')}
          </Link>
        </Reveal>

        <Reveal>
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: 32,
              background: 'var(--surface-card)',
              border: '1px solid var(--line)',
            }}
          >
            {/* Glow décoratif */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(ellipse at 70% 50%, rgba(245,158,11,0.07), transparent 60%)' }}
            />

            {/* Motif triangles en filigrane */}
            <svg aria-hidden className="absolute right-0 top-0 h-full" style={{ opacity: 0.06, width: 'auto' }} viewBox="0 0 300 300">
              <defs>
                <pattern id="port-banner-tri" width="28" height="32" patternUnits="userSpaceOnUse">
                  <path d="M14 3 L26 29 L2 29 Z" fill="none" stroke="var(--deco-stroke)" strokeWidth="0.6" />
                </pattern>
              </defs>
              <rect width="300" height="300" fill="url(#port-banner-tri)" />
            </svg>

            <div className="relative flex flex-col items-start gap-6 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:p-14">
              {/* Left */}
              <div className="max-w-lg">
                <div className="mb-5 flex items-center gap-3">
                  <Eyebrow>Portfolio</Eyebrow>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-soft"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber" />
                    </span>
                    Bientôt disponible
                  </span>
                </div>

                <h3
                  className="font-sans font-bold text-ink-0"
                  style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.025em' }}
                >
                  Nos créations,<br />
                  <span className="honey-text">bientôt en ligne.</span>
                </h3>

                <p className="mt-4 text-ink-2" style={{ fontSize: 15, lineHeight: 1.6, maxWidth: 440 }}>
                  Projets custom, séries limitées et collaborations — notre portfolio arrive prochainement.
                  En attendant, lancez votre propre projet sur-mesure.
                </p>

                <Link
                  href="/custom"
                  className="mt-6 inline-flex h-[46px] items-center gap-2 rounded-pill px-7 font-semibold text-[14px] cursor-pointer transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5"
                  style={{ background: 'var(--btn-primary-bg)', color: '#fff', boxShadow: 'var(--shadow-amber)' }}
                >
                  Demander un devis
                </Link>
              </div>

              {/* Right: placeholder tiles */}
              <div className="flex shrink-0 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex flex-col items-center justify-center gap-2" style={{ opacity: 1 - i * 0.22 }}>
                    <div
                      style={{
                        width: 80, height: 110,
                        borderRadius: 18,
                        background: 'var(--surface-neutral)',
                        border: '1px solid var(--line)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.2 }}>
                        <path d="M10 2 L18 17 L2 17 Z" stroke="var(--deco-stroke)" strokeWidth="1.2" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="rounded-full" style={{ width: 40, height: 6, background: 'var(--line-2)' }} />
                    <div className="rounded-full" style={{ width: 28, height: 5, background: 'var(--line)' }} />
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
