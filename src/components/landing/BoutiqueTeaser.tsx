import { useTranslations } from 'next-intl'
import Eyebrow from '@/components/ui/Eyebrow'
import Reveal from '@/components/ui/Reveal'

export default function BoutiqueTeaser() {
  const t = useTranslations('boutiqueTeaser')
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
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
              style={{
                background: 'radial-gradient(ellipse at 30% 50%, rgba(245,158,11,0.07), transparent 60%)',
              }}
            />

            {/* Motif hexagone en filigrane */}
            <svg
              aria-hidden
              className="absolute right-0 top-0 h-full"
              style={{ opacity: 0.06, width: 'auto' }}
              viewBox="0 0 300 300"
            >
              <defs>
                <pattern id="bt-hex" width="30" height="35" patternUnits="userSpaceOnUse">
                  <path
                    d="M15 3 L27 10 L27 24 L15 31 L3 24 L3 10 Z"
                    fill="none"
                    stroke="var(--deco-stroke)"
                    strokeWidth="0.6"
                  />
                </pattern>
              </defs>
              <rect width="300" height="300" fill="url(#bt-hex)" />
            </svg>

            <div className="relative flex flex-col items-start gap-6 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:p-14">
              {/* Left */}
              <div className="max-w-lg">
                <div className="mb-5 flex items-center gap-3">
                  <Eyebrow>Boutique</Eyebrow>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-soft"
                    style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}
                  >
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber" />
                    </span>
                    {t('badge')}
                  </span>
                </div>

                <h2
                  className="font-sans font-bold text-ink-0"
                  style={{
                    fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)',
                    lineHeight: 1.05,
                    letterSpacing: '-0.025em',
                  }}
                >
                  {t('headingLine1')}<br />
                  <span className="honey-text">{t('headingLine2')}</span>
                </h2>

                <p className="mt-4 text-ink-2" style={{ fontSize: 15, lineHeight: 1.6, maxWidth: 440 }}>
                  {t('description')}
                </p>
              </div>

              {/* Right: placeholder cards */}
              <div className="flex shrink-0 gap-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center gap-2"
                    style={{ opacity: 1 - i * 0.22 }}
                  >
                    <div
                      style={{
                        width: 80,
                        height: 100,
                        borderRadius: 18,
                        background: 'var(--surface-neutral)',
                        border: '1px solid var(--line)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="22" height="22" viewBox="0 0 20 20" fill="none" style={{ opacity: 0.2 }}>
                        <rect x="3" y="3" width="14" height="14" rx="3" stroke="var(--deco-stroke)" strokeWidth="1.2" />
                        <path d="M3 8h14M8 8v9" stroke="var(--deco-stroke)" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div
                      className="rounded-full"
                      style={{ width: 40, height: 6, background: 'var(--line-2)' }}
                    />
                    <div
                      className="rounded-full"
                      style={{ width: 28, height: 5, background: 'var(--line)' }}
                    />
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
