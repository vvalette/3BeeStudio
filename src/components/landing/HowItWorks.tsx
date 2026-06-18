import { useTranslations } from 'next-intl'
import Eyebrow from '@/components/ui/Eyebrow'

function Badge({ n }: { n: string }) {
  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-sm font-mono font-bold text-[#1A1300] flex-shrink-0"
      style={{ borderRadius: 14, fontSize: 17, background: 'linear-gradient(180deg, #FBBF24, #B45309)', boxShadow: '0 8px 20px rgba(245,158,11,0.3)' }}
    >
      {n}
    </div>
  )
}

export default function HowItWorks() {
  const t = useTranslations('howItWorks')

  const steps = [
    { n: '01', title: t('step1Title'), desc: t('step1Desc') },
    { n: '02', title: t('step2Title'), desc: t('step2Desc') },
    { n: '03', title: t('step3Title'), desc: t('step3Desc') },
  ]

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mb-12 max-w-2xl">
          <div className="mb-3"><Eyebrow>{t('eyebrow')}</Eyebrow></div>
          <h2 className="font-sans font-bold text-ink-0" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
            {t('heading')}
          </h2>
          <p className="mt-4 text-ink-1" style={{ fontSize: 'clamp(1rem, 1.3vw, 1.15rem)', lineHeight: 1.55 }}>
            {t('subheading')}
          </p>
        </div>

        {/* Desktop: 3-col with horizontal connector · Mobile: vertical stack */}
        <div className="relative grid gap-10 lg:grid-cols-3 lg:gap-8">
          {/* Horizontal connector line (desktop) */}
          <div
            aria-hidden
            className="hidden lg:block absolute left-0 right-0 top-6 h-px"
            style={{ background: 'linear-gradient(90deg, var(--line-amber), var(--line-amber) 66%, transparent)' }}
          />

          {steps.map((step, i) => (
            <div key={step.n} className="relative flex gap-5 lg:flex-col lg:gap-0">
              {/* Badge + mobile vertical connector */}
              <div className="relative flex flex-col items-center lg:items-start lg:mb-6">
                <Badge n={step.n} />
                {i < steps.length - 1 && (
                  <div
                    className="lg:hidden flex-1 mt-2 w-px"
                    style={{ background: 'linear-gradient(180deg, var(--line-amber), transparent)' }}
                  />
                )}
              </div>

              <div className="pt-1.5 lg:pt-0 flex-1">
                <h3 className="font-sans font-semibold text-ink-0 mb-2" style={{ fontSize: 20, lineHeight: 1.2, letterSpacing: '-0.015em' }}>
                  {step.title}
                </h3>
                <p className="text-ink-1" style={{ fontSize: 15, lineHeight: 1.55, maxWidth: 340 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
