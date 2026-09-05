'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import PaymentModeToggle, { type QuotePaymentMode } from './PaymentModeToggle'
import type { CustomOrder, QuoteLineItem } from '@/types/custom-order'

/**
 * Composition et envoi du devis sur-mesure.
 *
 * Les lignes saisies ici alimentent le PDF (src/lib/quote/pdf.ts) ET le total
 * encaissé : le total du devis est toujours la somme des lignes, jamais un
 * champ libre, pour qu'un client ne reçoive pas un PDF affichant autre chose
 * que ce qu'on lui demande de payer.
 *
 * Deux gestes, et c'est important qu'ils soient deux : « Enregistrer » pose le
 * total et l'acompte sur la demande sans rien envoyer, « Envoyer » y ajoute
 * l'email et le lien de paiement. Sans le premier, les montants tapés ici
 * restaient dans le navigateur : la carte « Paiements » en dessous continuait
 * d'afficher « aucun acompte défini », et le solde n'avait rien à déduire.
 */

interface ItemDraft {
  label: string
  detail: string
  quantity: string
  unitPrice: string  // en euros, tel que saisi
}

const EMPTY_ITEM: ItemDraft = { label: '', detail: '', quantity: '1', unitPrice: '' }

const inputClass = 'w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-3 transition-colors focus:border-amber/50 focus:outline-none'
const numClass   = `${inputClass} font-mono`
const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-3'

function toDrafts(items: QuoteLineItem[] | null): ItemDraft[] {
  if (!items?.length) return [{ ...EMPTY_ITEM }]
  return items.map((i) => ({
    label: i.label,
    detail: i.detail ?? '',
    quantity: String(i.quantity),
    unitPrice: (i.unit_price / 100).toFixed(2),
  }))
}

/** Centimes d'un montant saisi en euros. `NaN` et vide valent 0. */
function cents(euros: string): number {
  const value = Math.round(Number.parseFloat(euros.replace(',', '.')) * 100)
  return Number.isFinite(value) && value > 0 ? value : 0
}

function count(quantity: string): number {
  const value = Number.parseInt(quantity, 10)
  return Number.isFinite(value) && value > 0 ? value : 0
}

function draftTotal(items: ItemDraft[]): number {
  return items.reduce((sum, i) => sum + count(i.quantity) * cents(i.unitPrice), 0)
}

function toPayload(items: ItemDraft[]): QuoteLineItem[] {
  return items
    .filter((i) => i.label.trim() && count(i.quantity) > 0)
    .map((i) => ({
      label: i.label.trim(),
      ...(i.detail.trim() ? { detail: i.detail.trim() } : {}),
      quantity: count(i.quantity),
      unit_price: cents(i.unitPrice),
    }))
}

export default function AdminQuoteComposer({
  order,
  onSaved,
  onSent,
}: {
  order: CustomOrder
  /** Montants enregistrés sans envoi : la demande revient entière de l'API. */
  onSaved: (order: CustomOrder) => void
  onSent: (patch: Partial<CustomOrder>) => void
}) {
  const router = useRouter()
  const [object, setObject]   = useState(order.quote_object ?? '')
  const [items, setItems]     = useState<ItemDraft[]>(() => toDrafts(order.quote_items))
  const [deposit, setDeposit] = useState(order.deposit_amount ? String(order.deposit_amount / 100) : '')
  const [mode, setMode]       = useState<QuotePaymentMode>('stripe')
  const [sending, setSending] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const total = draftTotal(items)
  const payload = toPayload(items)
  const depositCents = cents(deposit)
  const tooBig = depositCents > total && total > 0
  // Enregistrer n'exige pas d'acompte : un devis peut se chiffrer avant qu'on
  // sache ce qu'on demande à la commande.
  const savable = payload.length > 0 && total > 0 && !tooBig
  const ready = savable && depositCents > 0

  function setItem(index: number, patch: Partial<ItemDraft>) {
    setSaved(false)
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  function draftBody() {
    return {
      quote_object: object.trim() || undefined,
      quote_items: payload.length ? payload : undefined,
      deposit_amount: depositCents || undefined,
    }
  }

  async function preview() {
    setError(null)
    // L'onglet s'ouvre AVANT le fetch : après un await, le navigateur ne
    // considère plus l'ouverture comme issue du clic et la bloque.
    const tab = window.open('', '_blank')
    setPreviewing(true)
    try {
      const res = await fetch(`/api/admin/custom/${order.id}/quote-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftBody()),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null) as { error?: string } | null
        throw new Error(json?.error ?? `Aperçu indisponible (${res.status})`)
      }
      const url = URL.createObjectURL(await res.blob())
      if (tab) tab.location.href = url
      else window.open(url, '_blank') // onglet bloqué : seconde chance
    } catch (e) {
      tab?.close()
      setError(e instanceof Error ? e.message : 'Aperçu indisponible')
    } finally {
      setPreviewing(false)
    }
  }

  /**
   * Pose le chiffrage sur la demande sans rien envoyer : le devis part parfois
   * par un autre canal, et l'acompte est parfois déjà encaissé. C'est aussi ce
   * qui alimente la carte « Paiements » en dessous.
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
          quote_object: object.trim() || null,
          quote_items: payload,
          total_amount: total,
          ...(depositCents ? { deposit_amount: depositCents } : {}),
        }),
      })
      const json = await res.json().catch(() => null) as (CustomOrder & { error?: string }) | null
      if (!res.ok) throw new Error(json?.error ?? `Erreur ${res.status}`)
      if (json) onSaved(json)
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
          deposit_amount: depositCents,
          quote_object: object.trim() || undefined,
          quote_items: payload,
          payment_mode: mode,
        }),
      })
      const json = await res.json().catch(() => null) as
        { error?: string; quote_number?: string; total_amount?: number } | null
      if (!res.ok) throw new Error(json?.error ?? 'Erreur inattendue')

      onSent({
        status: 'quote_sent',
        quote_number: json?.quote_number ?? null,
        quote_object: object.trim() || null,
        quote_items: payload,
        deposit_amount: depositCents,
        total_amount: json?.total_amount ?? total,
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
      {/* Objet */}
      <div>
        <label htmlFor="quote-object" className={labelClass}>Objet du devis</label>
        <input
          id="quote-object"
          value={object}
          onChange={(e) => { setSaved(false); setObject(e.target.value) }}
          placeholder="fabrication de 10 supports muraux — impression 3D PETG"
          className={inputClass}
        />
        <p className="mt-1.5 text-[11px] text-ink-3">
          Imprimé en tête du devis. Vide → première phrase de la demande du client.
        </p>
      </div>

      {/* Lignes */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Lignes du devis</span>
          <button
            type="button"
            onClick={addItem}
            className="flex cursor-pointer items-center gap-1.5 rounded-pill border border-[var(--line-2)] px-2.5 py-1 text-[11px] font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-amber"
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3.5v9M3.5 8h9" /></svg>
            Ajouter
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-xl border border-[var(--line-2)] bg-bg-2/50 p-3">
              <div className="flex items-start gap-2">
                <input
                  value={item.label}
                  onChange={(e) => setItem(index, { label: e.target.value })}
                  placeholder="Désignation (ex. Support mural sur-mesure)"
                  className={`${inputClass} flex-1`}
                />
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    aria-label={`Supprimer la ligne ${index + 1}`}
                    className="flex h-[38px] w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--line-2)] text-ink-3 transition-colors hover:border-red-500/40 hover:text-red-400"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                  </button>
                )}
              </div>

              <textarea
                value={item.detail}
                onChange={(e) => setItem(index, { detail: e.target.value })}
                rows={2}
                placeholder="Précisions sous le libellé — matière, finition, coloris (une par ligne)"
                className={`${inputClass} mt-2 resize-none text-[13px]`}
              />

              <div className="mt-2 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-ink-3">Qté</label>
                  <input
                    type="number" min="1" step="1"
                    value={item.quantity}
                    onChange={(e) => setItem(index, { quantity: e.target.value })}
                    className={numClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-wider text-ink-3">Prix unit. (€)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => setItem(index, { unitPrice: e.target.value })}
                    placeholder="3.50"
                    className={numClass}
                  />
                </div>
                <div className="pb-2 text-right">
                  <span className="font-mono text-sm font-semibold text-ink-1">
                    {formatPrice(count(item.quantity) * cents(item.unitPrice))}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total + acompte */}
      <div className="rounded-xl border border-[var(--line-amber)] p-4" style={{ background: 'rgba(245,158,11,0.05)' }}>
        <div className="flex items-baseline justify-between">
          <span className="text-[13px] font-semibold text-ink-1">Total du devis</span>
          <span className="font-mono text-lg font-bold text-amber">{formatPrice(total)}</span>
        </div>

        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="quote-deposit" className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
              Acompte (€) *
            </label>
            {total > 0 && (
              <button
                type="button"
                onClick={() => setDeposit((total / 200).toFixed(2))}
                className="cursor-pointer rounded-pill border border-[var(--line-2)] px-2.5 py-0.5 text-[11px] text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-amber"
              >
                50 % → {formatPrice(Math.round(total / 2))}
              </button>
            )}
          </div>
          <input
            id="quote-deposit"
            type="number" min="1" step="0.01"
            value={deposit}
            onChange={(e) => { setSaved(false); setDeposit(e.target.value) }}
            placeholder="150"
            className={numClass}
          />
          {depositCents > 0 && depositCents < total && (
            <p className="mt-1.5 text-[11px] text-ink-3">
              Solde restant : <span className="font-mono text-ink-2">{formatPrice(total - depositCents)}</span>, à réclamer avant expédition.
            </p>
          )}
          {depositCents > 0 && depositCents === total && (
            <p className="mt-1.5 text-[11px] text-ink-3">
              Réglé en une fois : pas de solde à réclamer ensuite.
            </p>
          )}
          {tooBig && (
            <p className="mt-1.5 text-[11px] text-red-400">L’acompte dépasse le total du devis.</p>
          )}
        </div>
      </div>

      <PaymentModeToggle value={mode} onChange={setMode} />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {/* « Enregistrer » d'abord : c'est le geste sans conséquence pour le
            client, et celui qui fait descendre les montants dans la carte
            « Paiements ». « Envoyer » écrit au client, il vient après. */}
        <button
          type="button"
          onClick={save}
          disabled={!savable || saving}
          className="flex h-[42px] cursor-pointer items-center gap-2 rounded-pill border border-[var(--line-2)] px-4 text-[13px] font-semibold text-ink-1 transition-colors hover:border-[var(--line-amber)] hover:text-amber disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            'Enregistrement…'
          ) : saved ? (
            <>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <path d="M2 7l3.5 3.5L12 4" />
              </svg>
              Enregistré
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2.5h7.5L13.5 5.5V13a.5.5 0 01-.5.5H3a.5.5 0 01-.5-.5V3a.5.5 0 01.5-.5z" /><path d="M5 2.5v3.5h5M5 13.5V9.5h6" />
              </svg>
              Enregistrer sans envoyer
            </>
          )}
        </button>

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
              {order.quote_number ? 'Renvoyer le devis + lien de paiement' : 'Envoyer le devis + lien de paiement'}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={preview}
          disabled={previewing}
          className="flex h-[42px] cursor-pointer items-center gap-2 rounded-pill border border-[var(--line-2)] px-4 text-[13px] font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-amber disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1.5 8s2.3-4 6.5-4 6.5 4 6.5 4-2.3 4-6.5 4-6.5-4-6.5-4z" /><circle cx="8" cy="8" r="1.8" />
          </svg>
          {previewing ? 'Génération…' : 'Aperçu du PDF'}
        </button>
      </div>

      <div className="space-y-1 text-[11px] leading-relaxed text-ink-3">
        <p>
          <span className="text-ink-2">Enregistrer</span> pose le total et l’acompte sur la demande,
          sans écrire au client. Ils apparaissent aussitôt dans la carte « Paiements ».
        </p>
        <p>
          <span className="text-ink-2">Envoyer</span>{' '}
          {mode === 'stripe'
            ? 'joint le devis en PDF à l’email et crée le lien de paiement de l’acompte.'
            : 'joint le devis en PDF à l’email, sans lien de paiement. Déclare l’acompte reçu depuis la carte « Paiements » quand le virement arrive.'}
        </p>
      </div>
    </div>
  )
}
