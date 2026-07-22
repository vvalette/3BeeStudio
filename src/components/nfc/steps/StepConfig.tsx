'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useDropzone, type FileRejection } from 'react-dropzone'
import NfcLinkPicker from '@/components/nfc/NfcLinkPicker'
import {
  buildConfigSchema, errorCls,
  StepTitle, SubSection, BtnPrimary, ArrowRight,
  type Config, type NfcFormData,
} from './shared'

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

// ─── Étape 1 : Configuration (logo + URL NFC) ─────────────────────────────────

export default function StepConfig({ defaultValues, logoFile, logoUrl, uploading, uploadError, onFileAccepted, onNext }: {
  defaultValues: Partial<NfcFormData>
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
            border: '1.5px dashed var(--line-12)',
            background: 'var(--hi-02)',
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
                    style={{ background: 'var(--hi-05)', border: '1px solid rgba(245,158,11,0.4)' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt={t('config.previewAlt')} className="h-16 w-16 rounded-lg object-contain" />
                    <span
                      className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500"
                      style={{ border: '2px solid var(--bg-1)' }}
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
                  style={{ background: 'var(--hi-04)', border: '1px solid var(--line)' }}
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
