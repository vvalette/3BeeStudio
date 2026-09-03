'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { formatPrice } from '@/lib/utils'
import PaymentModeToggle, { type QuotePaymentMode } from './PaymentModeToggle'
import type { CustomOrder } from '@/types/custom-order'

/**
 * Devis importé : un PDF fabriqué hors de l'app, envoyé tel quel au client.
 *
 * Le composeur (AdminQuoteComposer) fabrique le document depuis les lignes
 * saisies ; ici le document existe déjà et fait foi. L'app ne peut donc pas en
 * déduire le montant : le total est déclaré à la main, et c'est lui qui pilote
 * l'acompte, le solde et la facture.
 */

const inputClass = 'w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-3 transition-colors focus:border-amber/50 focus:outline-none'
const numClass   = `${inputClass} font-mono`
const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-3'

/** Centimes d'un montant saisi en euros. `NaN` et vide valent 0. */
function cents(euros: string): number {
  const value = Math.round(Number.parseFloat(euros.replace(',', '.')) * 100)
  return Number.isFinite(value) && value > 0 ? value : 0
}

/** Les champs texte du devis ont un minimum côté API : en dessous, on n'envoie rien. */
function optional(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length >= 3 ? trimmed : undefined
}

export default function AdminQuoteImport({
  order,
  onChange,
  onSent,
}: {
  order: CustomOrder
  /** Attache ou retrait du PDF — la fiche doit refléter l'état tout de suite. */
  onChange: (patch: Partial<CustomOrder>) => void
  onSent: (patch: Partial<CustomOrder>) => void
}) {
  const router = useRouter()
  const [object, setObject]       = useState(order.quote_object ?? '')
  const [reference, setReference] = useState(order.quote_number ?? '')
  const [total, setTotal]         = useState(order.total_amount ? String(order.total_amount / 100) : '')
  const [deposit, setDeposit]     = useState(order.deposit_amount ? String(order.deposit_amount / 100) : '')
  const [mode, setMode]           = useState<QuotePaymentMode>('stripe')
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving]   = useState(false)
  const [sending, setSending]     = useState(false)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const totalCents   = cents(total)
  const depositCents = cents(deposit)
  const ready = !!order.quote_pdf_path && totalCents > 0 && depositCents > 0 && depositCents <= totalCents
  // Enregistrer ne demande pas d'acompte : un devis déjà réglé en une fois n'en a pas.
  const savable = totalCents > 0 && depositCents <= totalCents

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/admin/custom/${order.id}/quote-file`, { method: 'POST', body: form })
      const json = await res.json().catch(() => null) as
        { error?: string; quote_pdf_path?: string; quote_pdf_name?: string } | null
      if (!res.ok) throw new Error(json?.error ?? `Téléversement refusé (${res.status})`)
      onChange({
        quote_pdf_path: json?.quote_pdf_path ?? null,
        quote_pdf_name: json?.quote_pdf_name ?? null,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Téléversement impossible')
    } finally {
      setUploading(false)
    }
  }, [order.id, onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  })

  async function removeFile() {
    setError(null)
    setRemoving(true)
    try {
      const res = await fetch(`/api/admin/custom/${order.id}/quote-file`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => null) as { error?: string } | null
        throw new Error(json?.error ?? 'Suppression impossible')
      }
      onChange({ quote_pdf_path: null, quote_pdf_name: null })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Suppression impossible')
    } finally {
      setRemoving(false)
    }
  }

  /**
   * Enregistre les montants sans rien envoyer : le devis a déjà été transmis au
   * client par ailleurs, et souvent l'acompte est même déjà encaissé.
   */
  async function save() {
    if (!savable) return
    setError(null)
    setSaved(false)
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/custom/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_amount: totalCents,
          ...(depositCents ? { deposit_amount: depositCents } : {}),
          quote_object: optional(object) ?? null,
          ...(optional(reference) ? { quote_number: optional(reference) } : {}),
        }),
      })
      const json = await res.json().catch(() => null) as (CustomOrder & { error?: string }) | null
      if (!res.ok) throw new Error(json?.error ?? `Erreur ${res.status}`)
      if (json) onChange(json)
      setSaved(true)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function send() {
    if (!ready) return
    setError(null)
    setSending(true)
    try {
      const res = await fetch(`/api/custom/${order.id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          use_imported_pdf: true,
          payment_mode: mode,
          deposit_amount: depositCents,
          total_amount: totalCents,
          quote_object: optional(object),
          quote_number: optional(reference),
        }),
      })
      const json = await res.json().catch(() => null) as
        { error?: string; quote_number?: string; total_amount?: number } | null
      if (!res.ok) throw new Error(json?.error ?? 'Erreur inattendue')

      onSent({
        status: 'quote_sent',
        quote_number: json?.quote_number ?? null,
        quote_object: optional(object) ?? null,
        quote_items: null,
        deposit_amount: depositCents,
        total_amount: json?.total_amount ?? totalCents,
      })
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Le PDF */}
      <div>
        <span className={labelClass}>Devis PDF</span>

        {order.quote_pdf_path ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-emerald-400">
              <path d="M9.5 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5l-3.5-3.5z" /><path d="M9.5 1.5V5H13" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-0">{order.quote_pdf_name ?? 'Devis.pdf'}</p>
              <p className="text-[11px] text-ink-3">Stocké en privé, joint tel quel à l’email du client</p>
            </div>
            {/* `source=imported` : relire le fichier téléversé, même si le
                dernier devis parti au client était un devis composé. */}
            <a
              href={`/api/admin/custom/${order.id}/quote-pdf?source=imported`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 cursor-pointer rounded-pill border border-[var(--line-2)] px-3 py-1 text-[11px] font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-amber"
            >
              Ouvrir
            </a>
            <button
              type="button"
              onClick={removeFile}
              disabled={removing}
              aria-label="Retirer le devis importé"
              className="shrink-0 cursor-pointer rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h10M5 5V3.5h6V5M6 8v5M10 8v5M4 5l1 8h6l1-8" />
              </svg>
            </button>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={[
              'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all',
              isDragActive ? 'border-amber bg-amber/5 text-amber' : 'border-[var(--line)] text-ink-3 hover:border-amber/50 hover:text-ink-2',
            ].join(' ')}
          >
            <input {...getInputProps()} />
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 10.5V2M8 2L5 5M8 2l3 3M2.5 11.5v1.5a1 1 0 001 1h9a1 1 0 001-1v-1.5" />
            </svg>
            <div>
              <p className="text-sm font-medium">
                {uploading ? 'Téléversement…' : 'Glisser ou cliquer pour importer le devis'}
              </p>
              <p className="text-[11px]">PDF uniquement — max 10 Mo</p>
            </div>
          </div>
        )}
      </div>

      {/* Objet + référence */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="import-object" className={labelClass}>Objet du devis</label>
          <input
            id="import-object"
            value={object}
            onChange={(e) => { setObject(e.target.value); setSaved(false) }}
            placeholder="fabrication de 10 supports muraux"
            className={inputClass}
          />
          <p className="mt-1.5 text-[11px] text-ink-3">
            Repris dans l’email. Vide → première phrase de la demande du client.
          </p>
        </div>

        <div>
          <label htmlFor="import-number" className={labelClass}>Numéro du devis</label>
          <input
            id="import-number"
            value={reference}
            onChange={(e) => { setReference(e.target.value); setSaved(false) }}
            placeholder="2026-014"
            className={numClass}
          />
          <p className="mt-1.5 text-[11px] text-ink-3">
            Celui imprimé sur votre PDF, pour que l’email dise la même chose.
            Vide → numéro maison (DEV-AAAA-NNN).
          </p>
        </div>
      </div>

      {/* Total + acompte */}
      <div className="rounded-xl border border-[var(--line-amber)] p-4" style={{ background: 'rgba(245,158,11,0.05)' }}>
        <div>
          <label htmlFor="import-total" className={labelClass}>Total du devis (€) *</label>
          <input
            id="import-total"
            type="number" min="1" step="0.01"
            value={total}
            onChange={(e) => { setTotal(e.target.value); setSaved(false) }}
            placeholder="350"
            className={numClass}
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
            Le montant imprimé sur le PDF, recopié à la main : rien ne le lit dans le fichier.
            Il sert au solde, au suivi des paiements et à la facture.
          </p>
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="import-deposit" className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Acompte (€) *
            </label>
            {totalCents > 0 && (
              <button
                type="button"
                onClick={() => setDeposit((totalCents / 200).toFixed(2))}
                className="cursor-pointer rounded-pill border border-[var(--line-2)] px-2.5 py-0.5 text-[11px] text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-amber"
              >
                50 % → {formatPrice(Math.round(totalCents / 2))}
              </button>
            )}
          </div>
          <input
            id="import-deposit"
            type="number" min="1" step="0.01"
            value={deposit}
            onChange={(e) => { setDeposit(e.target.value); setSaved(false) }}
            placeholder="150"
            className={numClass}
          />
          {depositCents > 0 && depositCents < totalCents && (
            <p className="mt-1.5 text-[11px] text-ink-3">
              Solde restant : <span className="font-mono text-ink-2">{formatPrice(totalCents - depositCents)}</span> — à réclamer avant expédition.
            </p>
          )}
          {depositCents > totalCents && totalCents > 0 && (
            <p className="mt-1.5 text-[11px] text-red-400">L’acompte dépasse le total du devis.</p>
          )}
        </div>
      </div>

      <PaymentModeToggle value={mode} onChange={setMode} />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={send}
        disabled={!ready || sending}
        className="flex h-[42px] cursor-pointer items-center gap-2 rounded-pill px-5 text-[13px] font-bold text-bg-0 transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: 'var(--btn-primary-bg)' }}
      >
        {sending ? (
          <>
            <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" />
            </svg>
            Envoi en cours…
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2L2 6.5l5 2L9 14l5-12z" />
            </svg>
            {order.quote_number ? 'Renvoyer le devis' : 'Envoyer le devis'}
            {mode === 'stripe' ? ' + lien de paiement' : ''}
          </>
        )}
      </button>

      <button
        type="button"
        onClick={save}
        disabled={!savable || saving}
        className="flex h-[42px] cursor-pointer items-center gap-2 rounded-pill border border-[var(--line-2)] px-4 text-[13px] font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-amber disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Enregistrer sans envoyer'}
      </button>
      </div>

      <p className="text-[11px] leading-relaxed text-ink-3">
        Le PDF importé part tel quel en pièce jointe{mode === 'stripe' ? ', avec le lien de paiement de l’acompte' : ', sans lien de paiement'}.
        L’email n’affiche pas le détail des lignes : il renvoie au document joint.
        <br />
        « Enregistrer sans envoyer » range le devis et ses montants sur la fiche sans écrire au client :
        pour un devis déjà transmis de ton côté, ou dont l’acompte est déjà encaissé.
      </p>
    </div>
  )
}
