'use client'

import { useState, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { calcOrder, getUnitPrice, formatDestination, isVCard, byteLength, NFC_CHIP_BYTE_LIMIT, FREE_SHIPPING_QTY } from '@/types/order'
import { formatPrice } from '@/lib/utils'
import { useDropzone, type FileRejection } from 'react-dropzone'
import Select from '@/components/ui/Select'
import NfcLinkPicker from '@/components/nfc/NfcLinkPicker'

// ─── Schémas par étape ────────────────────────────────────────────────────────

const configSchema = z.object({
  nfc_url: z.string()
    .min(1, 'Renseignez une destination')
    .refine(
      (v) => isVCard(v) || /^https?:/i.test(v),
      'Destination invalide',
    )
    .refine(
      (v) => !isVCard(v) || byteLength(v) <= NFC_CHIP_BYTE_LIMIT,
      'Fiche contact trop longue pour la puce NFC — raccourcissez-la',
    ),
})

const quantitySchema = z.object({
  quantity: z.number({ invalid_type_error: 'Quantité requise' }).int().min(5, 'Minimum 5 porte-clés'),
})

const coordsSchema = z.object({
  company: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(8, 'Téléphone invalide'),
  sector: z.string().min(2, 'Secteur requis'),
})

const addressSchema = z.object({
  shipping_name: z.string().min(2, 'Nom requis'),
  shipping_address: z.string().min(5, 'Adresse requise'),
  shipping_address2: z.string().optional(),
  shipping_city: z.string().min(2, 'Ville requise'),
  shipping_postal_code: z.string().min(4, 'Code postal invalide').max(6),
  shipping_country: z.string().length(2, 'Pays requis'),
})

const COUNTRIES: { value: string; label: string }[] = [
  { value: 'FR', label: 'France' },
  { value: 'BE', label: 'Belgique' },
  { value: 'CH', label: 'Suisse' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'MC', label: 'Monaco' },
]

const SECTORS = [
  'Restaurant / Food',
  'Salon de coiffure / Beauté',
  'Bien-être / Spa',
  'Immobilier',
  'Artisan / BTP',
  'Commerce de détail',
  'Agence de communication',
  'Autre',
]

const QUANTITY_PRESETS = [5, 10, 25, 50, 100, 250]

const contactSchema = coordsSchema.merge(addressSchema)

type Config = z.infer<typeof configSchema>
type Quantity = z.infer<typeof quantitySchema>
type Contact = z.infer<typeof contactSchema>
interface FormData extends Config, Quantity, Contact { logo_url: string }

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function NfcOrderForm() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<FormData>>({})
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

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
      setUploadError(e instanceof Error ? e.message : 'Erreur upload')
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
      setSubmitError(e instanceof Error ? e.message : 'Erreur lors de la commande')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{
        background: 'rgba(16,16,19,0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.05) inset',
      }}
    >
      <ProgressBar step={step} />

      <div className="p-7 sm:p-9">
        {step === 1 && (
          <StepConfig
            defaultValues={formData}
            logoFile={logoFile}
            logoUrl={logoUrl}
            uploading={uploading}
            uploadError={uploadError}
            onFileAccepted={handleLogoAccepted}
            onNext={(data) => { setFormData(p => ({ ...p, ...data })); setStep(2) }}
          />
        )}
        {step === 2 && (
          <StepQuantity
            defaultValues={formData}
            onBack={() => setStep(1)}
            onNext={(data) => { setFormData(p => ({ ...p, ...data })); setStep(3) }}
          />
        )}
        {step === 3 && (
          <StepContact
            defaultValues={formData}
            onBack={() => setStep(2)}
            onNext={(data) => { setFormData(p => ({ ...p, ...data })); setStep(4) }}
          />
        )}
        {step === 4 && (
          <StepRecap
            formData={formData as FormData}
            logoUrl={logoUrl!}
            submitting={submitting}
            submitError={submitError}
            onBack={() => setStep(3)}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </div>
  )
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const labels = ['Logo', 'Quantité', 'Contact', 'Paiement']

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
            <div key={n} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className="h-[2px] flex-1 rounded-full transition-colors duration-500"
                  style={{ background: isFirst ? 'transparent' : leftFilled ? '#F59E0B' : 'var(--line-2)' }}
                />
                <div
                  className="mx-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300"
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
                className="mt-2.5 text-[10px] font-medium tracking-wide transition-colors"
                style={{ color: active ? '#FAFAFA' : done ? '#F59E0B' : '#54545A' }}
              >
                {label}
              </span>
            </div>
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
    if (code === 'file-too-large') setRejectError('Fichier trop lourd (max 2 Mo). Exportez à nouveau votre SVG depuis votre logiciel de design.')
    else if (code === 'file-invalid-type') setRejectError('Format non supporté. Seul le format SVG est accepté pour la modélisation 3D.')
    else setRejectError("Fichier refusé. Vérifiez que c'est bien un fichier .svg (max 2 Mo).")
  }, [])

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
      <StepTitle num="01" title="Configuration" sub="Votre logo et la destination de la puce NFC" />

      {/* ── Sous-partie 1 : Logo ── */}
      <SubSection title="Votre logo" hint="Fichier SVG — requis pour la modélisation 3D">
        <div
          {...getRootProps()}
          className="relative cursor-pointer overflow-hidden rounded-2xl transition-all duration-300"
          style={isDragActive ? {
            border: '2px dashed #F59E0B',
            background: 'rgba(245,158,11,0.06)',
          } : logoUrl ? {
            border: '1.5px solid rgba(245,158,11,0.4)',
            background: 'rgba(245,158,11,0.04)',
          } : {
            border: '1.5px dashed rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.02)',
          }}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center py-9 px-6 text-center">
            {logoFile && logoUrl ? (
              <>
                <div
                  className="mb-4 flex h-24 w-24 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="Preview logo" className="h-20 w-20 rounded-lg object-contain" />
                </div>
                <p className="text-sm font-semibold text-emerald-400">Logo uploadé ✓</p>
                <p className="mt-1 text-xs text-ink-3">{logoFile.name} · Cliquer pour changer</p>
              </>
            ) : logoFile && uploading ? (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center">
                  <svg className="animate-spin text-amber" width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-sm text-amber">Upload en cours...</p>
              </>
            ) : (
              <>
                <div
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p className="text-base font-semibold text-ink-0">
                  {isDragActive ? 'Déposez votre logo ici' : 'Glisser-déposer ou cliquer'}
                </p>
                <p className="mt-1.5 text-sm font-semibold text-amber">Format SVG uniquement · Max 2 Mo</p>
                <div
                  className="mt-4 flex items-start gap-2.5 rounded-xl px-4 py-3 text-left"
                  style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}
                >
                  <svg className="mt-0.5 shrink-0" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="7"/>
                    <line x1="8" y1="7" x2="8" y2="11"/>
                    <circle cx="8" cy="5" r="0.5" fill="#F59E0B" stroke="none"/>
                  </svg>
                  <p className="text-xs leading-relaxed text-amber/80">
                    Le SVG est obligatoire pour tracer précisément les contours de votre logo et générer le modèle 3D en relief. Exportez-le depuis Illustrator, Figma ou Inkscape.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        {(rejectError || uploadError) && <p className={`mt-2 ${errorCls}`}>{rejectError || uploadError}</p>}
      </SubSection>

      {/* ── Sous-partie 2 : Lien ── */}
      <SubSection title="Votre lien" hint="Ce qui s'ouvre quand on approche le téléphone du porte-clé">
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
          Suivant <ArrowRight />
        </BtnPrimary>
      </div>
    </form>
  )
}

// ─── Étape 2 : Quantité ───────────────────────────────────────────────────────

function StepQuantity({ defaultValues, onBack, onNext }: {
  defaultValues: Partial<FormData>; onBack: () => void; onNext: (d: Quantity) => void
}) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Quantity>({
    resolver: zodResolver(quantitySchema),
    defaultValues: { quantity: defaultValues.quantity ?? 5 },
  })

  const qty = watch('quantity') ?? 5
  const { unitPrice, subtotal, shipping, total } = calcOrder(qty)
  const missingForFree = Math.max(0, FREE_SHIPPING_QTY - qty)

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <StepTitle num="02" title="Quantité" sub="Le prix au porte-clé baisse automatiquement selon le volume" />

      <div>
        <label className={labelCls}>Nombre de porte-clés</label>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {QUANTITY_PRESETS.map((value) => {
            const active = qty === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setValue('quantity', value, { shouldValidate: true })}
                className="flex flex-col cursor-pointer items-center rounded-xl py-3 px-2 text-center transition-all duration-200"
                style={active ? {
                  background: 'rgba(245,158,11,0.12)',
                  border: '1.5px solid rgba(245,158,11,0.6)',
                  boxShadow: '0 0 20px rgba(245,158,11,0.15)',
                } : {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <span className={`text-sm font-bold transition-colors ${active ? 'text-amber' : 'text-ink-1'}`}>{value}</span>
                <span className={`mt-0.5 text-[10px] font-mono transition-colors ${active ? 'text-amber/70' : 'text-ink-3'}`}>{formatPrice(getUnitPrice(value))}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--line)]" />
          <span className="text-xs text-ink-3">ou saisir</span>
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>
        <div className="mt-3">
          <input
            type="number"
            {...register('quantity', { valueAsNumber: true })}
            placeholder="Autre quantité (min. 5)"
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
          <span className="text-ink-2">Prix unitaire</span>
          <span className="font-mono text-ink-1">{formatPrice(unitPrice)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">Sous-total ({qty} porte-clés)</span>
          <span className="font-mono text-ink-1">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">Livraison</span>
          {shipping === 0 ? (
            <span className="font-mono font-semibold text-emerald-400">Offerte</span>
          ) : (
            <span className="font-mono text-ink-1">{formatPrice(shipping)}</span>
          )}
        </div>
        <div className="my-1 h-px bg-[var(--line-amber)]" />
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-amber">Total à payer</span>
          <span className="font-mono text-base font-bold text-amber">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Incitation livraison offerte */}
      {missingForFree > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4h9v7H1zM10 6h3l2 2v3h-5z" />
            <circle cx="4" cy="11" r="1.3" /><circle cx="12" cy="11" r="1.3" />
          </svg>
          Plus que <span className="text-amber">{missingForFree}</span> porte-clés pour la livraison offerte
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <BtnSecondary type="button" onClick={onBack}><ArrowLeft /> Retour</BtnSecondary>
        <BtnPrimary type="submit" fullWidth>Suivant <ArrowRight /></BtnPrimary>
      </div>
    </form>
  )
}

// ─── Étape 3 : Contact + Adresse ─────────────────────────────────────────────

function StepContact({ defaultValues, onBack, onNext }: {
  defaultValues: Partial<FormData>; onBack: () => void; onNext: (d: Contact) => void
}) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<Contact>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      ...defaultValues,
      shipping_country: defaultValues.shipping_country ?? 'FR',
    },
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-7">
      <StepTitle num="03" title="Contact & livraison" sub="Vos coordonnées et où envoyer votre commande" />

      <SubSection title="Vos coordonnées" hint="Pour confirmer la commande">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom de l'entreprise" error={errors.company?.message}>
            <Input {...register('company')} placeholder="Nom de votre entreprise" autoFocus />
          </Field>
          <Field label="Email professionnel" error={errors.email?.message}>
            <Input {...register('email')} type="email" placeholder="contact@entreprise.fr" />
          </Field>
          <Field label="Téléphone" error={errors.phone?.message}>
            <Input {...register('phone')} type="tel" placeholder="06 12 34 56 78" />
          </Field>
          <Field label="Secteur d'activité" error={errors.sector?.message}>
            <Controller
              name="sector"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  options={SECTORS}
                  placeholder="Choisir un secteur"
                  invalid={!!errors.sector}
                />
              )}
            />
          </Field>
        </div>
      </SubSection>

      <SubSection title="Adresse de livraison" hint="Où envoyer votre commande">
        <div className="grid gap-4">
          <Field label="Nom du destinataire" error={errors.shipping_name?.message}>
            <Input {...register('shipping_name')} placeholder="Prénom Nom ou raison sociale" />
          </Field>
          <Field label="Adresse" error={errors.shipping_address?.message}>
            <Input {...register('shipping_address')} placeholder="Numéro et nom de rue" />
          </Field>
          <Field label="Complément (optionnel)" error={errors.shipping_address2?.message}>
            <Input {...register('shipping_address2')} placeholder="Bâtiment, étage, digicode…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Code postal" error={errors.shipping_postal_code?.message}>
              <Input {...register('shipping_postal_code')} placeholder="75001" />
            </Field>
            <Field label="Ville" error={errors.shipping_city?.message}>
              <Input {...register('shipping_city')} placeholder="Paris" />
            </Field>
          </div>
          <Field label="Pays" error={errors.shipping_country?.message}>
            <Controller
              name="shipping_country"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  options={COUNTRIES}
                  placeholder="Choisir un pays"
                  invalid={!!errors.shipping_country}
                />
              )}
            />
          </Field>
        </div>
      </SubSection>

      <div className="flex gap-3 pt-2">
        <BtnSecondary type="button" onClick={onBack}><ArrowLeft /> Retour</BtnSecondary>
        <BtnPrimary type="submit" fullWidth>Suivant <ArrowRight /></BtnPrimary>
      </div>
    </form>
  )
}

// ─── Étape 4 : Récap + paiement ───────────────────────────────────────────────

function StepRecap({ formData, logoUrl, submitting, submitError, onBack, onSubmit }: {
  formData: FormData; logoUrl: string; submitting: boolean; submitError: string | null
  onBack: () => void; onSubmit: () => void
}) {
  const { subtotal, shipping, total } = calcOrder(formData.quantity)

  return (
    <div className="space-y-6">
      <StepTitle num="04" title="Récapitulatif" sub="Vérifiez votre commande avant le paiement" />

      <div className="grid gap-3 sm:grid-cols-2">
        <RecapCard title="Contact">
          <RecapRow label="Entreprise" value={formData.company} />
          <RecapRow label="Email" value={formData.email} />
          <RecapRow label="Tél." value={formData.phone} />
          <RecapRow label="Secteur" value={formData.sector} />
        </RecapCard>

        <RecapCard title="Commande">
          <RecapRow label="Quantité" value={`${formData.quantity} porte-clés`} />
          <RecapRow label="Destination" value={formatDestination(formData.nfc_url)} truncate />
          <RecapRow label="Sous-total" value={formatPrice(subtotal)} />
          <RecapRow label="Livraison" value={shipping === 0 ? 'Offerte' : formatPrice(shipping)} />
          <RecapRow label="Total" value={formatPrice(total)} />
        </RecapCard>

        <RecapCard title="Adresse de livraison">
          <RecapRow label="Destinataire" value={formData.shipping_name} />
          <RecapRow label="Adresse" value={formData.shipping_address} />
          {formData.shipping_address2 && (
            <RecapRow label="Complément" value={formData.shipping_address2} />
          )}
          <RecapRow label="Ville" value={`${formData.shipping_postal_code} ${formData.shipping_city}`} />
          <RecapRow label="Pays" value={COUNTRIES.find(c => c.value === formData.shipping_country)?.label ?? formData.shipping_country} />
        </RecapCard>
      </div>

      {/* Logo preview */}
      <div
        className="flex items-center gap-4 rounded-xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Logo" className="h-12 w-12 object-contain" />
        </div>
        <div>
          <p className="text-xs text-ink-3">Logo uploadé</p>
          <p className="text-sm font-medium text-ink-1">Prêt pour l&apos;impression</p>
        </div>
        <svg className="ml-auto text-emerald-400" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M6 10l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Paiement */}
      <div
        className="rounded-xl p-5 space-y-3"
        style={{ background: 'rgba(245,158,11,0.07)', border: '1.5px solid rgba(245,158,11,0.25)' }}
      >
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber/70">Total à payer</p>
            <p className="mt-0.5 text-3xl font-extrabold text-ink-0" style={{ letterSpacing: '-0.03em' }}>
              {formatPrice(total)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-3">Port inclus</p>
            <p className="font-mono text-sm font-semibold text-ink-2">{shipping === 0 ? 'Offert' : formatPrice(shipping)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="9" rx="1.5" stroke="#54545A" strokeWidth="1.2"/><path d="M4 4V3a3 3 0 016 0v1" stroke="#54545A" strokeWidth="1.2" strokeLinecap="round"/></svg>
          Paiement sécurisé · CB, Apple Pay, Google Pay
        </div>
      </div>

      {submitError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {submitError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <BtnSecondary type="button" onClick={onBack} disabled={submitting}><ArrowLeft /> Retour</BtnSecondary>
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
              Redirection...
            </>
          ) : (
            <>Payer {formatPrice(total)} <ArrowRight /></>
          )}
        </button>
      </div>

      <p className="text-center text-[11px] text-ink-3">
        En validant, vous acceptez nos{' '}
        <a href="/cgv" className="text-amber/60 underline hover:text-amber transition-colors">CGV</a>.
        {' '}Pas de droit de rétractation (Art. L221-28).
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

function RecapCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4 space-y-2"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function RecapRow({ label, value, mono, truncate }: { label: string; value: string; mono?: boolean; truncate?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-xs text-ink-3">{label}</span>
      <span className={[
        'text-xs text-ink-1 text-right',
        mono ? 'font-mono' : '',
        truncate ? 'max-w-[140px] truncate' : 'break-all',
      ].join(' ')}>
        {value}
      </span>
    </div>
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
