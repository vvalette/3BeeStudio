'use client'

import { useTranslations } from 'next-intl'

export default function ProgressBar({ step, onStepClick }: { step: number; onStepClick: (n: number) => void }) {
  const t = useTranslations('nfcForm')
  const labels = [t('progress.logo'), t('progress.quantity'), t('progress.contact'), t('progress.payment')]

  return (
    <div className="border-b border-[var(--line)] px-7 py-6 sm:px-9">
      <div className="flex">
        {labels.map((label, i) => {
          const n = i + 1
          const done = n < step
          const active = n === step
          const isFirst = i === 0
          const isLast = i === labels.length - 1
          const leftFilled = n <= step
          const rightFilled = n < step

          return (
            <button
              key={n}
              type="button"
              onClick={done ? () => onStepClick(n) : undefined}
              disabled={!done}
              title={done ? t('progress.back') : undefined}
              className={`group flex flex-1 flex-col items-center ${done ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex w-full items-center">
                <div
                  className="h-[2px] flex-1 rounded-full transition-colors duration-500"
                  style={{ background: isFirst ? 'transparent' : leftFilled ? '#F59E0B' : 'var(--line-2)' }}
                />
                <div
                  className={`mx-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 ${done ? 'group-hover:scale-110' : ''}`}
                  style={
                    done
                      ? { background: '#F59E0B', color: '#0A0A0B', boxShadow: '0 0 12px rgba(245,158,11,0.45)' }
                      : active
                      ? { background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1.5px solid #F59E0B', boxShadow: '0 0 0 4px rgba(245,158,11,0.06)' }
                      : { background: 'var(--bg-3)', color: 'var(--ink-3)', border: '1px solid var(--line-08)' }
                  }
                >
                  {done ? (
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                      <path d="M2 5.5L4.5 8L9 3" stroke="#0A0A0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : n}
                </div>
                <div
                  className="h-[2px] flex-1 rounded-full transition-colors duration-500"
                  style={{ background: isLast ? 'transparent' : rightFilled ? '#F59E0B' : 'var(--line-2)' }}
                />
              </div>
              <span
                className={`mt-2.5 text-[10px] font-medium tracking-wide transition-colors ${
                  active ? 'text-ink-0' : done ? 'text-amber group-hover:text-amber-soft' : 'text-ink-3'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
