'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { calcOrder, getUnitPrice, formatDestination, isVCard, byteLength, NFC_CHIP_BYTE_LIMIT, FREE_SHIPPING_QTY } from '@/types/order'
import { formatPrice } from '@/lib/utils'
import { useDropzone, type FileRejection } from 'react-dropzone'
import Select from '@/components/ui/Select'
import NfcLinkPicker, { DestinationIcon } from '@/components/nfc/NfcLinkPicker'

type TFunc = (key: string) => string

// ─── Schémas par étape (factories i18n) ───────────────────────────────────────

const buildConfigSchema = (t: TFunc) => z.object({
  nfc_url: z.string()
    .min(1, t('errors.destinationRequired'))
    .refine(
      (v) => isVCard(v) || /^https?:/i.test(v),
      t('errors.destinationInvalid'),
    )
    .refine(
      (v) => !isVCard(v) || byteLength(v) <= NFC_CHIP_BYTE_LIMIT,
      t('errors.vcardTooLong'),
    ),
})

const buildQuantitySchema = (t: TFunc) => z.object({
  quantity: z.number({ invalid_type_error: t('errors.quantityRequired') }).int().min(5, t('errors.quantityMin')),
})

const buildCoordsSchema = (t: TFunc) => z.object({
  company: z.string().min(2, t('errors.nameRequired')),
  email: z.string().email(t('errors.emailInvalid')),
  phone: z.string().min(8, t('errors.phoneInvalid')),
  sector: z.string().min(2, t('errors.sectorRequired')),
})

const buildAddressSchema = (t: TFunc) => z.object({
  shipping_name: z.string().min(2, t('errors.nameRequired')),
  shipping_address: z.string().min(5, t('errors.addressRequired')),
  shipping_address2: z.string().optional(),
  shipping_city: z.string().min(2, t('errors.cityRequired')),
  shipping_postal_code: z.string().min(4, t('errors.postalInvalid')).max(6),
  shipping_country: z.string().length(2, t('errors.countryRequired')),
})

const buildContactSchema = (t: TFunc) => buildCoordsSchema(t).merge(buildAddressSchema(t))

const COUNTRY_CODES = ['FR', 'BE', 'CH', 'LU', 'MC'] as const
const SECTOR_KEYS = ['restaurant', 'beauty', 'wellness', 'realEstate', 'craftsman', 'retail', 'agency', 'other'] as const

const QUANTITY_PRESETS = [5, 10, 25, 50, 100, 250]

type Config = z.infer<ReturnType<typeof buildConfigSchema>>
type Quantity = z.infer<ReturnType<typeof buildQuantitySchema>>
type Contact = z.infer<ReturnType<typeof buildContactSchema>>
interface FormData extends Config, Quantity, Contact { logo_url: string }

// ─── NoSvgTip ─────────────────────────────────────────────────────────────────

function NoSvgTip({ label, info }: { label: string; info: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }
  function handleLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <div className="relative mt-5" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3 hover:text-ink-1 transition-colors cursor-pointer"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {label}
      </button>

      {open && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-[260px] rounded-xl border border-[var(--line-amber)] bg-bg-3 px-4 py-3 text-xs leading-relaxed text-ink-2 shadow-[var(--shadow-pop)]"
          style={{ pointerEvents: 'auto' }}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          onClick={(e) => e.stopPropagation()}
        >
          {info}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-[var(--line-amber)]" />
        </div>
      )}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function NfcOrderForm() {
  const t = useTranslations('nfcForm')
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<FormData>>({})
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function goToStep(n: number) {
    setStep(n)
    requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  async function handleLogoAccepted(file: File) {
    setLogoFile(file)
    setUploadError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload/logo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setLogoUrl(json.url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : t('errors.upload'))
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/nfc/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, logo_url: logoUrl }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      window.location.href = json.checkout_url
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t('errors.order'))
      setSubmitting(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="scroll-mt-[88px] overflow-hidden rounded-2xl"
      style={{
        background: 'rgba(16,16,19,0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05) inset',
      }}
    >
      <ProgressBar step={step} onStepClick={goToStep} />

      <div className="p-7 sm:p-9">
        {step === 1 && (
          <StepConfig
            defaultValues={formData}
            logoFile={logoFile}
            logoUrl={logoUrl}
            uploading={uploading}
            uploadError={uploadError}
            onFileAccepted={handleLogoAccepted}
            onNext={(data) => { setFormData(p => ({ ...p, ...data })); goToStep(2) }}
          />
        )}
        {step === 2 && (
          <StepQuantity
            defaultValues={formData}
            onBack={() => goToStep(1)}
            onNext={(data) => { setFormData(p => ({ ...p, ...data })); goToStep(3) }}
          />
        )}
        {step === 3 && (
          <StepContact
            defaultValues={formData}
            onBack={() => goToStep(2)}
            onNext={(data) => { setFormData(p => ({ ...p, ...data })); goToStep(4) }}
          />
        )}
        {step === 4 && (
          <StepRecap
            formData={formData as FormData}
            logoUrl={logoUrl!}
            submitting={submitting}
            submitError={submitError}
            onBack={() => goToStep(3)}
            onEdit={goToStep}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step, onStepClick }: { step: number; onStepClick: (n: number) => void }) {
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
                      : { background: '#1C1C20', color: '#54545A', border: '1px solid rgba(255,255,255,0.08)' }
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

// ─── Étape 1 : Configuration (logo + URL NFC) ─────────────────────────────────

function StepConfig({ defaultValues, logoFile, logoUrl, uploading, uploadError, onFileAccepted, onNext }: {
  defaultValues: Partial<FormData>
  logoFile: File | null; logoUrl: string | null; uploading: boolean; uploadError: string | null
  onFileAccepted: (f: File) => void
  onNext: (d: Config) => void
}) {
  const t = useTranslations('nfcForm')
  const configSchema = useMemo(() => buildConfigSchema(t), [t])
  const { handleSubmit, control, formState: { errors } } = useForm<Config>({
    resolver: zodResolver(configSchema),
    defaultValues: { nfc_url: defaultValues.nfc_url },
  })

  const [rejectError, setRejectError] = useState<string | null>(null)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setRejectError(null)
      onFileAccepted(accepted[0])
    }
  }, [onFileAccepted])

  const onDropRejected = useCallback((rejections: FileRejection[]) => {
    const code = rejections[0]?.errors[0]?.code
    if (code === 'file-too-large') setRejectError(t('config.rejectTooLarge'))
    else if (code === 'file-invalid-type') setRejectError(t('config.rejectType'))
    else setRejectError(t('config.rejectGeneric'))
  }, [t])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      'image/svg+xml': ['.svg'],
    },
    maxSize: 2 * 1024 * 1024,
    multiple: false,
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-7">
      <StepTitle num="01" title={t('config.title')} sub={t('config.sub')} />

      {/* ── Sous-partie 1 : Logo ── */}
      <SubSection title={t('config.logoTitle')} hint={t('config.logoHint')}>
        <div
          {...getRootProps()}
          className="group relative cursor-pointer overflow-hidden rounded-2xl transition-all duration-300"
          style={isDragActive ? {
            border: '2px dashed #F59E0B',
            background: 'rgba(245,158,11,0.07)',
          } : logoUrl ? {
            border: '1.5px solid rgba(245,158,11,0.45)',
            background: 'rgba(245,158,11,0.04)',
          } : {
            border: '1.5px dashed rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <input {...getInputProps()} />

          {/* Lueur ambrée — drag actif (toujours) + survol (si pas encore de logo) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
            style={{ opacity: isDragActive ? 1 : 0, background: 'radial-gradient(circle at 50% 0%, rgba(245,158,11,0.13), transparent 70%)' }}
          />
          {!logoUrl && !isDragActive && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: 'radial-gradient(circle at 50% 0%, rgba(245,158,11,0.07), transparent 70%)' }}
            />
          )}

          <div className="relative flex min-h-[230px] flex-col items-center justify-center px-6 py-9 text-center">
            {logoFile && logoUrl ? (
              <>
                <div className="relative mb-4">
                  <div aria-hidden className="absolute -inset-2 rounded-full blur-lg" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.2), transparent 70%)' }} />
                  <div
                    className="relative flex h-24 w-24 items-center justify-center rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(245,158,11,0.4)' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt={t('config.previewAlt')} className="h-16 w-16 rounded-lg object-contain" />
                    <span
                      className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500"
                      style={{ border: '2px solid #101013' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M2 5.5L4.5 8L9 3" stroke="#0A0A0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-ink-0">{t('config.uploaded')}</p>
                <div
                  className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-pill px-3 py-1"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--line)' }}
                >
                  <svg className="shrink-0 text-ink-3" width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 1.5H4.5A1.5 1.5 0 003 3v10a1.5 1.5 0 001.5 1.5h7A1.5 1.5 0 0013 13V5.5L9 1.5z" /><path d="M9 1.5V5.5H13" />
                  </svg>
                  <span className="truncate font-mono text-[11px] text-ink-2">{logoFile.name}</span>
                </div>
                <p className="mt-2 text-xs text-ink-3">{t('config.clickToChange')}</p>
              </>
            ) : logoFile && uploading ? (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center">
                  <svg className="animate-spin text-amber" width="34" height="34" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(245,158,11,0.18)" strokeWidth="2.5" />
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="44" strokeDashoffset="30" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-amber">{t('config.uploading')}</p>
              </>
            ) : (
              <>
                <div className="relative mb-5">
                  <div aria-hidden className="absolute -inset-3 rounded-full blur-xl" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.22), transparent 70%)' }} />
                  <div
                    className="relative flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105"
                    style={{ background: 'linear-gradient(160deg, rgba(245,158,11,0.2), rgba(245,158,11,0.04))', border: '1px solid rgba(245,158,11,0.3)' }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                </div>
                <p className="text-[15px] font-semibold text-ink-0">
                  {isDragActive ? t('config.dropHere') : t('config.dropPrompt')}
                </p>
                <p className="mt-3 text-[12px] text-ink-2 text-center max-w-[220px]">{t('config.formatLabel')}</p>
                <NoSvgTip label={t('config.noSvg')} info={t.rich('config.svgInfo', {
                  mail: (chunks) => (
                    <a
                      href="mailto:contact@3beestudio.fr"
                      onClick={(e) => e.stopPropagation()}
                      className="font-semibold text-amber underline decoration-amber/40 underline-offset-2 transition-colors hover:decoration-amber"
                    >
                      {chunks}
                    </a>
                  ),
                })} />
              </>
            )}
          </div>
        </div>
        {(rejectError || uploadError) && <p className={`mt-2 ${errorCls}`}>{rejectError || uploadError}</p>}
      </SubSection>

      {/* ── Sous-partie 2 : Lien ── */}
      <SubSection title={t('config.linkTitle')} hint={t('config.linkHint')}>
        <Controller
          name="nfc_url"
          control={control}
          render={({ field }) => (
            <NfcLinkPicker
              value={field.value}
              onChange={field.onChange}
              error={errors.nfc_url?.message}
            />
          )}
        />
      </SubSection>

      <div className="flex pt-1">
        <BtnPrimary type="submit" fullWidth disabled={!logoUrl || uploading}>
          {t('next')} <ArrowRight />
        </BtnPrimary>
      </div>
    </form>
  )
}

// ─── Étape 2 : Quantité ───────────────────────────────────────────────────────

function StepQuantity({ defaultValues, onBack, onNext }: {
  defaultValues: Partial<FormData>; onBack: () => void; onNext: (d: Quantity) => void
}) {
  const t = useTranslations('nfcForm')
  const quantitySchema = useMemo(() => buildQuantitySchema(t), [t])
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Quantity>({
    resolver: zodResolver(quantitySchema),
    defaultValues: { quantity: defaultValues.quantity ?? 5 },
  })

  const qty = watch('quantity') ?? 5
  const { unitPrice, subtotal, shipping, total } = calcOrder(qty)
  const missingForFree = Math.max(0, FREE_SHIPPING_QTY - qty)
  const basePrice = getUnitPrice(5)
  const discountPct = Math.round((1 - unitPrice / basePrice) * 100)

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <StepTitle num="02" title={t('quantity.title')} sub={t('quantity.sub')} />

      <div className="mt-6">
        <label className={labelCls}>{t('quantity.label')}</label>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {QUANTITY_PRESETS.map((value) => {
            const active = qty === value
            const popular = value === 50
            return (
              <button
                key={value}
                type="button"
                onClick={() => setValue('quantity', value, { shouldValidate: true })}
                className="relative flex flex-col cursor-pointer items-center rounded-xl py-3 px-2 text-center transition-all duration-200"
                style={active ? {
                  background: 'rgba(245,158,11,0.12)',
                  border: '1.5px solid rgba(245,158,11,0.6)',
                  boxShadow: '0 0 20px rgba(245,158,11,0.15)',
                } : {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {popular && (
                  <span
                    className="absolute -top-2 rounded-pill px-1.5 py-px text-[8px] font-bold uppercase tracking-wider"
                    style={{ background: 'var(--btn-primary-bg)', color: '#1A1300' }}
                  >
                    {t('quantity.popular')}
                  </span>
                )}
                <span className={`text-sm font-bold transition-colors ${active ? 'text-amber' : 'text-ink-1'}`}>{value}</span>
                <span className={`mt-0.5 text-[10px] font-mono transition-colors ${active ? 'text-amber/70' : 'text-ink-3'}`}>{formatPrice(getUnitPrice(value))}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--line)]" />
          <span className="text-xs text-ink-3">{t('quantity.or')}</span>
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>
        <div className="mt-3">
          <input
            type="number"
            {...register('quantity', { valueAsNumber: true })}
            placeholder={t('quantity.customPlaceholder')}
            min={5}
            className={`${inputCls} text-center font-mono`}
          />
          {errors.quantity && <p className={errorCls}>{errors.quantity.message}</p>}
        </div>
      </div>

      {/* Prix résumé */}
      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">{t('quantity.unitPrice')}</span>
          <span className="font-mono text-ink-1">
            {discountPct > 0 && (
              <span className="mr-2 text-emerald-400">−{discountPct}%</span>
            )}
            {formatPrice(unitPrice)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">{t('quantity.subtotal', { qty })}</span>
          <span className="font-mono text-ink-1">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">{t('quantity.shipping')}</span>
          {shipping === 0 ? (
            <span className="font-mono font-semibold text-emerald-400">{t('quantity.free')}</span>
          ) : (
            <span className="font-mono text-ink-1">{formatPrice(shipping)}</span>
          )}
        </div>
        <div className="my-1 h-px bg-[var(--line-amber)]" />
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-amber">{t('quantity.total')}</span>
          <span className="font-mono text-base font-bold text-amber">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Incitation livraison offerte */}
      {missingForFree > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-ink-3">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4h9v7H1zM10 6h3l2 2v3h-5z" />
              <circle cx="4" cy="11" r="1.3" /><circle cx="12" cy="11" r="1.3" />
            </svg>
            {t.rich('quantity.freeShippingHint', {
              count: missingForFree,
              amber: (chunks) => <span className="text-amber">{chunks}</span>,
            })}
          </div>
          <div className="h-1 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (qty / FREE_SHIPPING_QTY) * 100)}%`,
                background: 'linear-gradient(90deg, rgba(245,158,11,0.5), #F59E0B)',
              }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <BtnSecondary type="button" onClick={onBack}><ArrowLeft /> {t('back')}</BtnSecondary>
        <BtnPrimary type="submit" fullWidth>{t('next')} <ArrowRight /></BtnPrimary>
      </div>
    </form>
  )
}

// ─── Étape 3 : Contact + Adresse ─────────────────────────────────────────────

function StepContact({ defaultValues, onBack, onNext }: {
  defaultValues: Partial<FormData>; onBack: () => void; onNext: (d: Contact) => void
}) {
  const t = useTranslations('nfcForm')
  const contactSchema = useMemo(() => buildContactSchema(t), [t])
  const sectorOptions = useMemo(() => SECTOR_KEYS.map((k) => t(`sectors.${k}`)), [t])
  const countryOptions = useMemo(
    () => COUNTRY_CODES.map((c) => ({ value: c, label: t(`countries.${c}`) })),
    [t],
  )
  const { register, handleSubmit, control, formState: { errors } } = useForm<Contact>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      ...defaultValues,
      shipping_country: defaultValues.shipping_country ?? 'FR',
    },
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-7">
      <StepTitle num="03" title={t('contact.title')} sub={t('contact.sub')} />

      <SubSection title={t('contact.coordsTitle')} hint={t('contact.coordsHint')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('contact.company')} error={errors.company?.message}>
            <Input {...register('company')} placeholder={t('contact.companyPlaceholder')} autoComplete="off" autoFocus />
          </Field>
          <Field label={t('contact.email')} error={errors.email?.message}>
            <Input {...register('email')} type="email" placeholder="contact@entreprise.fr" autoComplete="off" />
          </Field>
          <Field label={t('contact.phone')} error={errors.phone?.message}>
            <Input {...register('phone')} type="tel" placeholder="06 12 34 56 78" autoComplete="off" />
          </Field>
          <Field label={t('contact.sector')} error={errors.sector?.message}>
            <Controller
              name="sector"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  options={sectorOptions}
                  placeholder={t('contact.sectorPlaceholder')}
                  invalid={!!errors.sector}
                />
              )}
            />
          </Field>
        </div>
      </SubSection>

      <SubSection title={t('contact.addressTitle')} hint={t('contact.addressHint')}>
        <div className="grid gap-4">
          <Field label={t('contact.recipient')} error={errors.shipping_name?.message}>
            <Input {...register('shipping_name')} placeholder={t('contact.recipientPlaceholder')} autoComplete="off" />
          </Field>
          <Field label={t('contact.address')} error={errors.shipping_address?.message}>
            <Input {...register('shipping_address')} placeholder={t('contact.addressPlaceholder')} autoComplete="off" />
          </Field>
          <Field label={t('contact.address2')} error={errors.shipping_address2?.message}>
            <Input {...register('shipping_address2')} placeholder={t('contact.address2Placeholder')} autoComplete="off" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('contact.postalCode')} error={errors.shipping_postal_code?.message}>
              <Input {...register('shipping_postal_code')} placeholder="75001" autoComplete="off" />
            </Field>
            <Field label={t('contact.city')} error={errors.shipping_city?.message}>
              <Input {...register('shipping_city')} placeholder="Paris" autoComplete="off" />
            </Field>
          </div>
          <Field label={t('contact.country')} error={errors.shipping_country?.message}>
            <Controller
              name="shipping_country"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  options={countryOptions}
                  placeholder={t('contact.countryPlaceholder')}
                  invalid={!!errors.shipping_country}
                />
              )}
            />
          </Field>
        </div>
      </SubSection>

      <div className="flex gap-3 pt-2">
        <BtnSecondary type="button" onClick={onBack}><ArrowLeft /> {t('back')}</BtnSecondary>
        <BtnPrimary type="submit" fullWidth>{t('next')} <ArrowRight /></BtnPrimary>
      </div>
    </form>
  )
}

// ─── Étape 4 : Récap + paiement ───────────────────────────────────────────────

function StepRecap({ formData, logoUrl, submitting, submitError, onBack, onEdit, onSubmit }: {
  formData: FormData; logoUrl: string; submitting: boolean; submitError: string | null
  onBack: () => void; onEdit: (step: number) => void; onSubmit: () => void
}) {
  const t = useTranslations('nfcForm')
  const { unitPrice, subtotal, shipping, total } = calcOrder(formData.quantity)
  const [hasNewsletterDiscount, setHasNewsletterDiscount] = useState(false)

  useEffect(() => {
    if (!formData.email) return
    fetch(`/api/newsletter/check?email=${encodeURIComponent(formData.email)}`)
      .then((r) => r.json())
      .then((d: { hasDiscount: boolean }) => setHasNewsletterDiscount(d.hasDiscount))
      .catch(() => {})
  }, [formData.email])

  const discountedSubtotal = hasNewsletterDiscount ? Math.round(subtotal * 0.9) : subtotal
  const finalTotal = discountedSubtotal + shipping
  const discountAmount = subtotal - discountedSubtotal
  const code = formData.shipping_country
  const countryLabel = (COUNTRY_CODES as readonly string[]).includes(code) ? t(`countries.${code}`) : code

  return (
    <div className="space-y-5">
      <StepTitle num="04" title={t('recap.title')} sub={t('recap.sub')} />

      {/* ── Produit ── */}
      <RecapSection icon={<TagMini />} title={t('recap.orderTitle')} onEdit={() => onEdit(1)}>
        <div className="flex items-center gap-4">
          {/* Logo dans son écrin */}
          <div
            className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl"
            style={{
              background: 'radial-gradient(circle at 50% 30%, rgba(245,158,11,0.16), rgba(255,255,255,0.03) 75%)',
              border: '1px solid rgba(245,158,11,0.3)',
              boxShadow: '0 0 24px rgba(245,158,11,0.12)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={t('recap.logoAlt')} className="h-14 w-14 rounded-lg object-contain" />
            <span
              className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500"
              style={{ border: '2px solid #101013' }}
              title={t('recap.logoValidated')}
            >
              <svg width="9" height="9" viewBox="0 0 11 11" fill="none">
                <path d="M2 5.5L4.5 8L9 3" stroke="#0A0A0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-ink-0">{t('recap.productName')}</p>
            <p className="mt-0.5 text-xs text-ink-3">{t('recap.productDesc')}</p>
            <div
              className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-pill px-2.5 py-1"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}
            >
              <span className="flex shrink-0 text-amber"><DestinationIcon value={formData.nfc_url} size={12} /></span>
              <span className="truncate font-mono text-[11px] text-amber-soft">
                {formatDestination(formData.nfc_url)}
              </span>
            </div>
          </div>

          {/* Quantité */}
          <div
            className="flex shrink-0 flex-col items-center rounded-xl px-3.5 py-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="font-mono text-lg font-bold leading-tight text-ink-0">×{formData.quantity}</span>
            <span className="font-mono text-[10px] text-ink-3">{formatPrice(unitPrice)} /u</span>
          </div>
        </div>
      </RecapSection>

      {/* ── Contact + Livraison ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <RecapSection icon={<UserTiny />} title={t('recap.contactTitle')} onEdit={() => onEdit(3)}>
          <p className="text-sm font-semibold text-ink-0">{formData.company}</p>
          <p className="mt-0.5 text-xs text-ink-3">{formData.sector}</p>
          <div className="mt-3 space-y-2">
            <p className="flex items-center gap-2 text-[13px] text-ink-1">
              <span className="text-ink-3"><MailTiny /></span>
              <span className="truncate">{formData.email}</span>
            </p>
            <p className="flex items-center gap-2 text-[13px] text-ink-1">
              <span className="text-ink-3"><PhoneTiny /></span>
              {formData.phone}
            </p>
          </div>
        </RecapSection>

        <RecapSection icon={<PinTiny />} title={t('recap.shippingTitle')} onEdit={() => onEdit(3)}>
          <address className="text-[13px] not-italic leading-relaxed text-ink-1">
            <span className="font-semibold text-ink-0">{formData.shipping_name}</span><br />
            {formData.shipping_address}<br />
            {formData.shipping_address2 && <>{formData.shipping_address2}<br /></>}
            {formData.shipping_postal_code} {formData.shipping_city}
          </address>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-3">{countryLabel}</p>
        </RecapSection>
      </div>

      {/* ── Total — style reçu ── */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          border: '1px solid rgba(245,158,11,0.28)',
          background: 'linear-gradient(180deg, rgba(245,158,11,0.10), rgba(245,158,11,0.03))',
        }}
      >
        <div className="space-y-2.5 px-5 pt-5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink-2">
              {t('recap.subtotal')} <span className="font-mono text-xs text-ink-3">{formData.quantity} × {formatPrice(unitPrice)}</span>
            </span>
            <span className={`font-mono ${hasNewsletterDiscount ? 'text-ink-3 line-through text-xs' : 'text-ink-1'}`}>{formatPrice(subtotal)}</span>
          </div>
          {hasNewsletterDiscount && (
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span>✨</span>
                <span>{t('recap.newsletterDiscount')}</span>
              </span>
              <span className="font-mono font-semibold text-emerald-400">−{formatPrice(discountAmount)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink-2">{t('recap.trackedShipping')}</span>
            {shipping === 0 ? (
              <span className="font-mono font-semibold text-emerald-400">{t('quantity.free')}</span>
            ) : (
              <span className="font-mono text-ink-1">{formatPrice(shipping)}</span>
            )}
          </div>
        </div>

        <div className="mx-5 my-4 border-t border-dashed" style={{ borderColor: 'rgba(245,158,11,0.3)' }} />

        <div className="flex items-end justify-between px-5 pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber/80">{t('quantity.total')}</p>
            <p className="mt-1 text-[34px] font-extrabold leading-none text-ink-0" style={{ letterSpacing: '-0.03em' }}>
              {formatPrice(finalTotal)}
            </p>
          </div>
          <p className="text-right text-[11px] leading-relaxed text-ink-3">
            {t.rich('recap.vat', { br: () => <br /> })}
          </p>
        </div>

        <div
          className="flex items-center justify-center gap-2 px-5 py-3"
          style={{ borderTop: '1px solid rgba(245,158,11,0.14)', background: 'rgba(10,8,1,0.35)' }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="9" rx="1.5" stroke="#87878E" strokeWidth="1.2"/><path d="M4 4V3a3 3 0 016 0v1" stroke="#87878E" strokeWidth="1.2" strokeLinecap="round"/></svg>
          <span className="text-[11px] text-ink-2">{t('recap.securePayment')}</span>
        </div>
      </div>

      {submitError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {submitError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <BtnSecondary type="button" onClick={onBack} disabled={submitting}><ArrowLeft /> {t('back')}</BtnSecondary>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-pill text-[15px] font-semibold text-[#1A1300] transition-all active:scale-[0.97] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          style={{
            background: submitting ? '#F59E0B' : 'var(--btn-primary-bg)',
            boxShadow: submitting ? 'none' : 'var(--btn-primary-shadow)',
          }}
        >
          {submitting ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
              </svg>
              {t('recap.redirecting')}
            </>
          ) : (
            <>{t('recap.pay', { amount: formatPrice(finalTotal) })} <ArrowRight /></>
          )}
        </button>
      </div>

      <p className="text-center text-[11px] text-ink-3">
        {t.rich('recap.consent', {
          cgv: (chunks) => <a href="/cgv" className="text-amber/60 underline hover:text-amber transition-colors">{chunks}</a>,
        })}
      </p>
    </div>
  )
}

// ─── Sous-composants UI ───────────────────────────────────────────────────────

function StepTitle({ num, title, sub }: { num: string; title: string; sub: string }) {
  return (
    <div className="mb-1">
      <div className="mb-3 inline-flex items-center">
        <span className="font-mono text-[11px] uppercase leading-none tracking-[0.16em] text-amber">
          {num}<span className="text-ink-3"> / 04</span>
        </span>
      </div>
      <h2 className="font-bold text-ink-0" style={{ fontSize: '1.4rem', letterSpacing: '-0.025em', lineHeight: 1.1 }}>{title}</h2>
      <p className="mt-1.5 text-sm text-ink-3">{sub}</p>
    </div>
  )
}

function SubSection({ title, hint, children }: {
  title: string; hint: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span
          className="block h-1.5 w-1.5 shrink-0 rounded-full bg-amber"
          style={{ boxShadow: '0 0 10px var(--amber)' }}
        />
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-ink-0">{title}</span>
          <span className="text-[11px] text-ink-3">— {hint}</span>
        </div>
      </div>
      {children}
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      {children}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  )
}

function RecapSection({ icon, title, onEdit, children }: {
  icon: React.ReactNode; title: string; onEdit: () => void; children: React.ReactNode
}) {
  const t = useTranslations('nfcForm')
  return (
    <section
      className="overflow-hidden rounded-2xl"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
          <span className="flex text-amber/70">{icon}</span>
          {title}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-amber/70 transition-colors hover:text-amber"
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 1.5l2.5 2.5L5 11.5l-3.2.7.7-3.2L10 1.5z" />
          </svg>
          {t('edit')}
        </button>
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

// ─── Mini-icônes du récap ─────────────────────────────────────────────────────

function TagMini() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.6 1.5H14v5.4l-7 7-5.4-5.4 7-7z" />
      <circle cx="11" cy="4.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function UserTiny() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="2.5" />
      <path d="M3 13c.8-2.4 2.7-3.3 5-3.3s4.2.9 5 3.3" />
    </svg>
  )
}

function PinTiny() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 14.5s5-4.4 5-8a5 5 0 10-10 0c0 3.6 5 8 5 8z" />
      <circle cx="8" cy="6.3" r="1.7" />
    </svg>
  )
}

function MailTiny() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="M2 5l6 4 6-4" />
    </svg>
  )
}

function PhoneTiny() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 2.5h2l1.3 3.3-1.6 1a7 7 0 003.3 3.3l1-1.6 3.3 1.3v2a1.3 1.3 0 01-1.3 1.3A10.7 10.7 0 012.2 3.8 1.3 1.3 0 013.5 2.5z" />
    </svg>
  )
}

const Input = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`${inputCls} ${className}`}
    {...props}
  />
)

function BtnPrimary({ children, fullWidth, disabled, type = 'button', onClick }: {
  children: React.ReactNode; fullWidth?: boolean; disabled?: boolean
  type?: 'button' | 'submit'; onClick?: () => void
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-pill text-[15px] font-semibold text-[#1A1300] transition-all active:scale-[0.97] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 disabled:hover:brightness-100 ${fullWidth ? 'flex-1' : 'px-8'}`}
      style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
    >
      {children}
    </button>
  )
}

function BtnSecondary({ children, type = 'button', onClick, disabled }: {
  children: React.ReactNode; type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex h-[52px] shrink-0 cursor-pointer items-center gap-2 rounded-pill border px-6 text-sm font-medium text-ink-2 transition-all active:scale-[0.97] hover:border-amber/30 hover:text-ink-1 disabled:cursor-not-allowed disabled:opacity-40"
      style={{ borderColor: 'var(--line-amber)', background: 'rgba(10,8,1,0.4)' }}
    >
      {children}
    </button>
  )
}

function ArrowRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
      <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function ArrowLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
      <path d="M11 7H3M3 7L6.5 3.5M3 7L6.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Styles partagés ──────────────────────────────────────────────────────────

const inputCls = [
  'w-full rounded-xl px-4 py-3 text-sm text-ink-0 font-sans',
  'placeholder:text-ink-3 transition-all outline-none',
  'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]',
  'focus:border-amber/40 focus:bg-[rgba(245,158,11,0.04)]',
].join(' ')

const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-ink-3'
const errorCls = 'text-xs text-red-400'
