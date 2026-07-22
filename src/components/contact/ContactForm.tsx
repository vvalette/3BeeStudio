'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { CheckCircle2, Send } from 'lucide-react'

const inputCls =
  'w-full rounded-xl border border-[var(--line)] bg-bg-2 px-4 py-3 text-[14px] text-ink-0 placeholder:text-ink-3 outline-none transition-colors focus:border-[var(--line-amber)] focus:ring-1 focus:ring-[rgba(245,158,11,0.25)]'

type TFunc = ReturnType<typeof useTranslations<'contactPage'>>

const buildSchema = (t: TFunc) =>
  z.object({
    name:    z.string().min(2, t('errName')).max(100, t('errName')),
    email:   z.string().email(t('errEmail')).max(200, t('errEmail')),
    subject: z.string().max(150).optional(),
    message: z.string().min(10, t('errMessage')).max(5000, t('errMessage')),
    website: z.string().optional(), // honeypot — jamais affiché
  })

type FormData = z.infer<ReturnType<typeof buildSchema>>

export default function ContactForm() {
  const t = useTranslations('contactPage')
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(buildSchema(t)) })

  async function onSubmit(data: FormData) {
    setSubmitError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.status === 429) {
        setSubmitError(t('errorRateLimit'))
        return
      }
      if (!res.ok) {
        setSubmitError(t('errorGeneric'))
        return
      }
      setSent(true)
    } catch {
      setSubmitError(t('errorGeneric'))
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-bg-1 p-8 text-center sm:p-10">
        <CheckCircle2 className="mx-auto h-10 w-10 text-amber" />
        <h2 className="mt-4 text-xl font-bold text-ink-0">{t('successTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-2">{t('successDesc')}</p>
        <button
          onClick={() => {
            reset()
            setSent(false)
          }}
          className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-pill border border-[var(--line)] px-5 py-2.5 text-sm font-semibold text-ink-1 transition-colors hover:text-ink-0"
        >
          {t('sendAnother')}
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="rounded-2xl border border-[var(--line)] bg-bg-1 p-6 sm:p-8"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('nameLabel')} error={errors.name?.message}>
          <input {...register('name')} className={inputCls} placeholder={t('namePlaceholder')} autoComplete="off" />
        </Field>
        <Field label={t('emailLabel')} error={errors.email?.message}>
          <input {...register('email')} type="email" className={inputCls} placeholder={t('emailPlaceholder')} autoComplete="off" inputMode="email" />
        </Field>
      </div>

      <div className="mt-4">
        <Field label={t('subjectLabel')} error={errors.subject?.message}>
          <input {...register('subject')} className={inputCls} placeholder={t('subjectPlaceholder')} autoComplete="off" />
        </Field>
      </div>

      <div className="mt-4">
        <Field label={t('messageLabel')} error={errors.message?.message}>
          <textarea
            {...register('message')}
            rows={6}
            className={inputCls + ' resize-none'}
            placeholder={t('messagePlaceholder')}
          />
        </Field>
      </div>

      {/* Honeypot anti-spam — invisible pour un humain, rempli par les bots */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px]">
        <input {...register('website')} tabIndex={-1} autoComplete="off" />
      </div>

      {submitError && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.04)] px-4 py-3">
          <p className="text-[13px] text-[#F87171]">{submitError}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-pill px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
      >
        <Send className="h-4 w-4" />
        {isSubmitting ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-1">{label}</span>
      {children}
      {error && <span className="mt-1 block text-[12px] text-[#F87171]">{error}</span>}
    </label>
  )
}
