'use client'

import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { useTranslations } from 'next-intl'
import ProgressBar from './steps/ProgressBar'
import StepConfig, { type StepConfigHandle } from './steps/StepConfig'
import StepQuantity from './steps/StepQuantity'
import StepContact from './steps/StepContact'
import StepRecap from './steps/StepRecap'
import type { NfcFormData } from './steps/shared'

// Orchestrateur du formulaire de commande NFC : navigation entre étapes,
// accumulation des données, upload du logo et soumission finale.
// Le contenu de chaque étape vit dans ./steps/.

export interface NfcOrderFormHandle {
  /** Retient la quantité cliquée dans la grille tarifaire (NfcPricing).
   *  'jumped' : l'étape 1 est complète, l'étape 2 s'ouvre sur cette quantité.
   *  'saved'  : quantité mémorisée, l'étape 1 reste à remplir. */
  pickQuantity: (qty: number) => Promise<'jumped' | 'saved'>
}

interface Props {
  /** Remonte la quantité validée à l'étape 2, pour que la grille reste synchro. */
  onQuantityChange?: (qty: number) => void
}

const NfcOrderForm = forwardRef<NfcOrderFormHandle, Props>(function NfcOrderForm({ onQuantityChange }, ref) {
  const t = useTranslations('nfcForm')
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<NfcFormData>>({})
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const stepConfigRef = useRef<StepConfigHandle>(null)

  function goToStep(n: number) {
    setStep(n)
    requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  // Raccourci depuis la grille tarifaire : le clic sur un palier vaut « Suivant ».
  // On ne saute à l'étape 2 que si l'étape 1 passe sa validation, sinon la barre de
  // progression marquerait « Logo » comme faite sans logo ni destination, et le
  // récap final partirait incomplet.
  useImperativeHandle(ref, () => ({
    async pickQuantity(qty) {
      setFormData(p => ({ ...p, quantity: qty }))
      if (step !== 1) { goToStep(2); return 'jumped' }
      // Sans logo, rien à valider : le bouton « Suivant » est lui aussi désactivé.
      const passed = Boolean(logoUrl) && (await stepConfigRef.current?.submit()) === true
      // Si ça passe, StepConfig.onNext a déjà ouvert l'étape 2 (et fait défiler).
      // Sinon on ne bouge pas la page : la grille, et donc le message « quantité
      // retenue », doit rester sous les yeux du client.
      return passed ? 'jumped' : 'saved'
    },
  }), [step, logoUrl])

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
        background: 'var(--glass)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--line-07)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 1px 0 var(--hi-05) inset',
      }}
    >
      <ProgressBar step={step} onStepClick={goToStep} />

      <div className="p-7 sm:p-9">
        {step === 1 && (
          <StepConfig
            ref={stepConfigRef}
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
            key={formData.quantity ?? 'default'}
            defaultValues={formData}
            onBack={() => goToStep(1)}
            onNext={(data) => {
              setFormData(p => ({ ...p, ...data }))
              onQuantityChange?.(data.quantity)
              goToStep(3)
            }}
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
            formData={formData as NfcFormData}
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
})

export default NfcOrderForm
