'use client'

import { useState, useMemo, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { PROJECT_TYPES } from '@/types/custom-order'
import PhoneInput from '@/components/ui/PhoneInput'

type TFunc = (key: string) => string

// ── Schémas par étape (factory i18n) ────────────────────────────────────────────

const buildFullSchema = (t: TFunc) =>
  z.object({
    project_type: z.string().min(1, t('errors.projectType')),
    description:  z.string().min(20, t('errors.description')).max(2000),
    first_name: z.string().min(2, t('errors.firstName')),
    last_name:  z.string().min(2, t('errors.lastName')),
    company: z.string().optional(),
    email:   z.string().email(t('errors.email')),
    phone:   z.string().min(8, t('errors.phone')),
    shipping_first_name: z.string().min(2, t('errors.shippingFirstName')),
    shipping_last_name:  z.string().min(2, t('errors.shippingLastName')),
    shipping_address:     z.string().min(5, t('errors.shippingAddress')),
    shipping_city:        z.string().min(2, t('errors.shippingCity')),
    shipping_postal_code: z.string().min(4, t('errors.shippingPostal')),
  })

type FormData = z.infer<ReturnType<typeof buildFullSchema>>

// ── Styles partagés ────────────────────────────────────────────────────────────

const labelCls = 'block text-[13px] font-medium text-ink-2 mb-2'
const inputCls = 'w-full rounded-xl border border-[var(--line)] bg-bg-2 px-4 py-3 text-[14px] text-ink-0 placeholder:text-ink-3 outline-none transition-colors focus:border-[var(--line-amber)] focus:ring-1 focus:ring-[rgba(245,158,11,0.25)]'
const errorCls = 'mt-1.5 text-[12px] text-red-400'

// ── Composants utilitaires ─────────────────────────────────────────────────────

function StepTitle({ num, title, sub }: { num: string; title: string; sub: string }) {
  return (
    <div className="mb-7">
      <div className="mb-3 inline-flex items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">
          {num}<span className="text-ink-3"> / 03</span>
        </span>
      </div>
      <h2 className="font-bold text-ink-0" style={{ fontSize: '1.4rem', letterSpacing: '-0.025em', lineHeight: 1.1 }}>{title}</h2>
      <p className="mt-1.5 text-sm text-ink-3">{sub}</p>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  )
}

// ── Formulaire principal ───────────────────────────────────────────────────────

export default function SurMesureForm() {
  const t = useTranslations('surMesureForm')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [refFile, setRefFile] = useState<File | null>(null)
  const [refFileUrl, setRefFileUrl] = useState<string | null>(null)
  const [refUploading, setRefUploading] = useState(false)
  const [refUploadError, setRefUploadError] = useState<string | null>(null)
  const router = useRouter()

  const fullSchema = useMemo(() => buildFullSchema(t), [t])

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(fullSchema),
    mode: 'onBlur',
  })

  const projectType = watch('project_type')

  async function nextStep() {
    const fields: (keyof FormData)[][] = [
      ['project_type', 'description'],
      ['first_name', 'last_name', 'company', 'email', 'phone'],
      ['shipping_first_name', 'shipping_last_name', 'shipping_address', 'shipping_city', 'shipping_postal_code'],
    ]
    const ok = await trigger(fields[step - 1])
    if (ok) setStep((s) => s + 1)
  }

  async function handleRefFileAccepted(file: File) {
    setRefFile(file)
    setRefUploadError(null)
    setRefUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/custom-reference', { method: 'POST', body: fd })
      const json = await res.json() as { url?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? t('errors.upload'))
      setRefFileUrl(json.url ?? null)
    } catch (e) {
      setRefUploadError(e instanceof Error ? e.message : t('errors.upload'))
    } finally {
      setRefUploading(false)
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    setApiError('')
    try {
      const { first_name, last_name, shipping_first_name, shipping_last_name, ...rest } = data
      const payload = {
        ...rest,
        name: `${first_name} ${last_name}`.trim(),
        shipping_name: `${shipping_first_name} ${shipping_last_name}`.trim(),
        reference_file_url: refFileUrl,
      }
      const res = await fetch('/api/custom/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json() as { order_id?: string; error?: string }
      if (!res.ok) throw new Error(json.error ?? t('errors.unexpected'))
      router.push(`/custom/${json.order_id}?submitted=true`)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : t('errors.generic'))
      setLoading(false)
    }
  }

  const values = getValues()

  return (
    <div
      className="w-full rounded-2xl border border-[var(--line)] bg-bg-1 p-6 sm:p-8"
      style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}
    >
      {/* Barre de progression */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300"
              style={
                s < step
                  ? { background: 'linear-gradient(180deg,#FBBF24,#F59E0B)', color: '#1A1300' }
                  : s === step
                    ? { background: 'var(--bg-3)', color: '#FBBF24', border: '1px solid rgba(245,158,11,0.4)' }
                    : { background: 'var(--bg-3)', color: 'var(--ink-3)', border: '1px solid var(--line-08)' }
              }
            >
              {s < step ? '✓' : s}
            </div>
            {s < 3 && (
              <div
                className="h-[2px] flex-1 rounded-full transition-colors duration-500"
                style={{ background: s < step ? 'linear-gradient(90deg,#FBBF24,#F59E0B)' : 'var(--line-07)' }}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Champs pilotés via setValue — doivent être enregistrés en permanence */}
        <input type="hidden" {...register('project_type')} />

        {/* ── Étape 1 : Projet ── */}
        {step === 1 && (
          <>
            <StepTitle num="01" title={t('step1.title')} sub={t('step1.sub')} />

            <Field label={t('step1.projectType')} error={errors.project_type?.message}>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PROJECT_TYPES.map(({ value }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('project_type', value, { shouldValidate: true })}
                    className="cursor-pointer rounded-xl border px-3 py-3 text-left text-[13px] font-medium transition-all"
                    style={{
                      background: projectType === value ? 'rgba(245,158,11,0.1)' : 'var(--bg-2)',
                      border: projectType === value ? '1px solid rgba(245,158,11,0.45)' : '1px solid var(--line)',
                      color: projectType === value ? '#FBBF24' : 'var(--ink-1)',
                    }}
                  >
                    {t(`projectTypes.${value}`)}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={t('step1.description')} error={errors.description?.message}>
              <textarea
                {...register('description')}
                rows={4}
                placeholder={t('step1.descriptionPlaceholder')}
                className={inputCls + ' resize-none'}
              />
              <p className="mt-1 text-right font-mono text-[10px] text-ink-3">
                {(watch('description') ?? '').length}/2000
              </p>
            </Field>

            <div className="flex items-start gap-2.5 rounded-xl border border-[rgba(248,113,113,0.2)] bg-[rgba(248,113,113,0.04)] px-4 py-3">
              <svg className="mt-0.5 shrink-0 text-red-400" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L14.5 13H1.5L8 2z"/><path d="M8 6.5v3M8 11.5v.5"/>
              </svg>
              <p className="text-[12px] leading-relaxed text-ink-3">
                {t('step1.disclaimer')}
              </p>
            </div>

            <Field label={t('step1.referenceFile')} error={refUploadError ?? undefined}>
              <ReferenceFileDropzone
                file={refFile}
                fileUrl={refFileUrl}
                uploading={refUploading}
                onFileAccepted={handleRefFileAccepted}
                onRemove={() => { setRefFile(null); setRefFileUrl(null); setRefUploadError(null) }}
                t={t}
              />
              <p className="mt-2 text-[12px] text-ink-3">{t('step1.referenceFileHint')}</p>
            </Field>
          </>
        )}

        {/* ── Étape 2 : Contact ── */}
        {step === 2 && (
          <>
            <StepTitle num="02" title={t('step2.title')} sub={t('step2.sub')} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('step2.firstName')} error={errors.first_name?.message}>
                <input {...register('first_name')} className={inputCls} placeholder="Jean" autoComplete="off" />
              </Field>
              <Field label={t('step2.lastName')} error={errors.last_name?.message}>
                <input {...register('last_name')} className={inputCls} placeholder="Dupont" autoComplete="off" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('step2.company')} error={errors.company?.message}>
                <input {...register('company')} className={inputCls} placeholder="Acme Corp" autoComplete="off" />
              </Field>
              <Field label={t('step2.email')} error={errors.email?.message}>
                <input {...register('email')} type="email" className={inputCls} placeholder="vous@exemple.fr" autoComplete="off" />
              </Field>
            </div>

            <Field label={t('step2.phone')} error={errors.phone?.message}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    invalid={!!errors.phone}
                    required
                  />
                )}
              />
            </Field>

            <div className="rounded-xl border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.04)] px-4 py-3">
              <p className="text-[13px] text-ink-2">
                {t.rich('step2.notice', { strong: (chunks) => <span className="font-semibold text-amber-soft" style={{ whiteSpace: 'nowrap' }}>{chunks}</span> })}
              </p>
            </div>
          </>
        )}

        {/* ── Étape 3 : Adresse ── */}
        {step === 3 && (
          <>
            <StepTitle num="03" title={t('step3.title')} sub={t('step3.sub')} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('step3.recipientFirstName')} error={errors.shipping_first_name?.message}>
                <input {...register('shipping_first_name')} className={inputCls} placeholder="Jean" autoComplete="off" />
              </Field>
              <Field label={t('step3.recipientLastName')} error={errors.shipping_last_name?.message}>
                <input {...register('shipping_last_name')} className={inputCls} placeholder="Dupont" autoComplete="off" />
              </Field>
            </div>

            <Field label={t('step3.address')} error={errors.shipping_address?.message}>
              <input {...register('shipping_address')} className={inputCls} placeholder="12 rue de la Paix" autoComplete="off" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('step3.postalCode')} error={errors.shipping_postal_code?.message}>
                <input {...register('shipping_postal_code')} className={inputCls} placeholder="75001" autoComplete="off" />
              </Field>
              <Field label={t('step3.city')} error={errors.shipping_city?.message}>
                <input {...register('shipping_city')} className={inputCls} placeholder="Paris" autoComplete="off" />
              </Field>
            </div>

            {/* Récap rapide */}
            <div className="rounded-xl border border-[var(--line)] bg-bg-2 p-4 space-y-2">
              <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-ink-3 mb-3">{t('step3.recap')}</p>
              <RecapRow label={t('step3.recapProject')} value={values.project_type ? t(`projectTypes.${values.project_type}`) : ''} />
              {refFile && <RecapRow label={t('step3.recapFile')} value={refFile.name} />}
              <RecapRow label={t('step3.recapContact')} value={[[values.first_name, values.last_name].filter(Boolean).join(' '), values.email].filter(Boolean).join(' · ')} />
            </div>
          </>
        )}

        {/* Erreur API */}
        {apiError && (
          <p className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">{apiError}</p>
        )}

        {/* Boutons navigation */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="cursor-pointer flex h-[50px] flex-1 items-center justify-center rounded-pill border border-[var(--line-2)] bg-bg-3 text-[14px] font-semibold text-ink-1 transition-all hover:bg-bg-4"
            >
              ← {t('back')}
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              className="cursor-pointer flex h-[50px] flex-1 items-center justify-center gap-2 rounded-pill text-[14px] font-semibold text-[#1A1300] transition-all active:scale-[0.97] hover:brightness-105"
              style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
            >
              {t('continue')} →
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer flex h-[50px] flex-1 items-center justify-center gap-2 rounded-pill text-[14px] font-semibold text-[#1A1300] transition-all active:scale-[0.97] hover:brightness-105 disabled:opacity-60"
              style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
            >
              {loading ? t('sending') : t('submit')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function ReferenceFileDropzone({ file, fileUrl, uploading, onFileAccepted, onRemove, t }: {
  file: File | null
  fileUrl: string | null
  uploading: boolean
  onFileAccepted: (f: File) => void
  onRemove: () => void
  t: TFunc
}) {
  const [rejectError, setRejectError] = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setRejectError(null)
      onFileAccepted(accepted[0])
    }
  }, [onFileAccepted])

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    const code = rejections[0]?.errors[0]?.code
    if (code === 'file-too-large') setRejectError(t('step1.referenceFileTooLarge'))
    else setRejectError(t('step1.referenceFileRejectGeneric'))
  }, [t])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    maxSize: 20 * 1024 * 1024,
    multiple: false,
  })

  return (
    <div>
      <div
        {...getRootProps()}
        className="cursor-pointer rounded-xl border px-4 py-5 text-center transition-all"
        style={isDragActive ? {
          border: '2px dashed #F59E0B',
          background: 'rgba(245,158,11,0.07)',
        } : file ? {
          border: '1px solid rgba(245,158,11,0.45)',
          background: 'rgba(245,158,11,0.04)',
        } : {
          border: '1.5px dashed var(--line-2)',
          background: 'var(--bg-2)',
        }}
      >
        <input {...getInputProps()} />
        {file && uploading ? (
          <p className="text-[13px] font-medium text-amber">{t('step1.referenceFileUploading')}</p>
        ) : file ? (
          <div className="flex items-center justify-center gap-2">
            {fileUrl && <span className="text-emerald-400">✓</span>}
            <span className="truncate font-mono text-[12px] text-ink-1">{file.name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove() }}
              className="cursor-pointer text-[11px] font-semibold text-red-400 underline underline-offset-2"
            >
              {t('step1.referenceFileRemove')}
            </button>
          </div>
        ) : (
          <p className="text-[13px] text-ink-2">
            {isDragActive ? t('step1.referenceFileDropHere') : t('step1.referenceFileDropPrompt')}
          </p>
        )}
      </div>
      {rejectError && <p className={errorCls}>{rejectError}</p>}
    </div>
  )
}

function RecapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-[12px] text-ink-3 shrink-0">{label}</span>
      <span className="text-[13px] text-ink-1 text-right truncate">{value}</span>
    </div>
  )
}
