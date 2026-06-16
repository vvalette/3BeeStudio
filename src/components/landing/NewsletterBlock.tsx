'use client'

import { useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import Eyebrow from '@/components/ui/Eyebrow'

export default function NewsletterBlock() {
  const t = useTranslations('newsletter')
  const [email, setEmail]   = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="py-20 lg:py-28 border-t border-[var(--line)]" style={{ background: 'var(--bg-1)' }}>
      <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center">
        <div className="mb-4 flex justify-center"><Eyebrow>{t('eyebrow')}</Eyebrow></div>
        <h2 className="font-sans font-bold text-ink-0 mb-4" style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
          {t('heading')}
        </h2>
        <p className="text-ink-1 mb-9 mx-auto" style={{ fontSize: 'clamp(1rem, 1.3vw, 1.15rem)', lineHeight: 1.55, maxWidth: 460 }}>
          {t('description')}
        </p>

        {status === 'success' ? (
          <div className="mx-auto inline-flex items-center gap-3 rounded-pill border border-[var(--line-amber)] px-6 py-4" style={{ background: 'var(--amber-tint)' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-ink-1" style={{ fontSize: 15 }}>{t('success')}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {status === 'error' && (
              <p className="text-red-400 text-sm">{t('error')}</p>
            )}
          <form onSubmit={handleSubmit} className="mx-auto flex gap-2 p-2 border border-[var(--line)] bg-bg-2 max-w-md w-full" style={{ borderRadius: 999 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('placeholder')}
              required
              className="flex-1 bg-transparent border-none outline-none text-ink-0 placeholder:text-ink-3 px-4 font-sans"
              style={{ fontSize: 15, minWidth: 0 }}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="flex h-[46px] cursor-pointer items-center justify-center rounded-pill px-6 font-sans font-semibold text-[15px] text-[#1A1300] transition-all active:scale-[0.97] hover:brightness-105 disabled:opacity-60 whitespace-nowrap"
              style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
            >
              {status === 'loading' ? '…' : t('submit')}
            </button>
          </form>
          </div>
        )}
      </div>
    </section>
  )
}
