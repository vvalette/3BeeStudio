'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Select from '@/components/ui/Select'
import { formatPrice } from '@/lib/utils'
import {
  computeBalance,
  paymentState,
  MANUAL_PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type CustomOrder,
  type PaymentMethod,
} from '@/types/custom-order'

/**
 * Qui a payé quoi, quand, et par quel moyen.
 *
 * Tout ne passe pas par Stripe : un acompte arrive souvent par virement, parfois
 * en espèces. Aucun webhook ne vient alors poser la date d'encaissement, donc
 * l'admin la déclare ici. C'est cette date qui fait foi pour la déclaration de
 * CA, d'où le champ date plutôt qu'un simple bouton « payé ».
 */

/** Date du jour au format attendu par `<input type="date">`. */
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function frDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Centimes d'un montant saisi en euros. Vide ou illisible vaut 0. */
function cents(euros: string): number {
  const value = Math.round(Number.parseFloat(euros.replace(',', '.')) * 100)
  return Number.isFinite(value) && value > 0 ? value : 0
}

export default function AdminCustomPayments({
  order,
  onChange,
}: {
  order: CustomOrder
  onChange: (order: CustomOrder) => void
}) {
  const pay = paymentState(order)
  const balanceDue = computeBalance(order)

  return (
    <div className="space-y-3 text-sm">
      {order.deposit_amount !== null && (
        <PaymentLine
          label="Acompte"
          amount={order.deposit_amount}
          received={pay.depositPaid}
          at={pay.depositPaidAt}
          method={pay.depositMethod}
          pendingLabel="en attente de règlement"
        />
      )}

      <Receipt
        order={order}
        kind="deposit"
        received={pay.depositPaid}
        declared={!!pay.depositPaidAt}
        defaultAmount={order.deposit_amount}
        onChange={onChange}
      />

      {(order.balance_amount || balanceDue) && (
        <PaymentLine
          label="Solde"
          amount={order.balance_amount ?? balanceDue ?? 0}
          received={pay.balancePaid}
          at={pay.balancePaidAt}
          method={pay.balanceMethod}
          pendingLabel={order.balance_payment_url ? 'demande envoyée, en attente' : 'pas encore réclamé'}
        />
      )}

      {/* Réclamer le solde avant l'acompte n'a pas de sens : la production n'est
          pas lancée, il n'y a rien à libérer. */}
      {pay.depositPaid && (
        <Receipt
          order={order}
          kind="balance"
          received={pay.balancePaid}
          declared={!!pay.balancePaidAt}
          defaultAmount={order.balance_amount ?? balanceDue}
          onChange={onChange}
        />
      )}

      {order.total_amount && (
        <>
          <div className="my-1 border-t border-dashed" style={{ borderColor: 'var(--line-amber)' }} />
          <div className="flex items-baseline justify-between">
            <span className="text-ink-2">Encaissé</span>
            <span className="font-mono font-semibold text-ink-0">{formatPrice(pay.amountPaid)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-semibold text-amber">Total du devis</span>
            <span className="font-mono text-base font-bold text-amber">{formatPrice(order.total_amount)}</span>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Une échéance : montant, moyen, et surtout si l'argent est arrivé.
 *
 * La date peut manquer sur les demandes réglées avant la migration 035 — on
 * affiche alors « reçu » sans date plutôt que d'inventer un horodatage.
 */
function PaymentLine({
  label, amount, received, at, method, pendingLabel,
}: {
  label: string
  amount: number
  received: boolean
  at: string | null
  method: PaymentMethod | null
  pendingLabel: string
}) {
  const how = received && method ? ` · ${PAYMENT_METHOD_LABELS[method]}` : ''
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="min-w-0">
        <span className="text-ink-2">{label}</span>
        <span className={['ml-1.5 text-[11px]', received ? 'text-emerald-400' : 'text-ink-3'].join(' ')}>
          {received
            ? at ? `· reçu le ${frDate(at)}${how}` : `· reçu${how}`
            : `· ${pendingLabel}`}
        </span>
      </span>
      <span className={['shrink-0 font-mono', received ? 'text-ink-1' : 'text-ink-3'].join(' ')}>
        {formatPrice(amount)}
      </span>
    </div>
  )
}

/** Déclaration (ou annulation) d'un encaissement reçu hors Stripe. */
function Receipt({
  order, kind, received, declared, defaultAmount, onChange,
}: {
  order: CustomOrder
  kind: 'deposit' | 'balance'
  received: boolean
  /** Vrai si la date d'encaissement existe : sans elle, rien à annuler. */
  declared: boolean
  defaultAmount: number | null
  onChange: (order: CustomOrder) => void
}) {
  const router = useRouter()
  const [open, setOpen]     = useState(false)
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount / 100) : '')
  const [date, setDate]     = useState(today())
  const [method, setMethod] = useState<PaymentMethod>('transfer')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const what = kind === 'deposit' ? 'acompte' : 'solde'

  async function submit(isReceived: boolean) {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/custom/${order.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          received: isReceived,
          ...(isReceived ? { amount: cents(amount) || undefined, paid_at: date, method } : {}),
        }),
      })
      const json = await res.json().catch(() => null) as (CustomOrder & { error?: string }) | null
      if (!res.ok) throw new Error(json?.error ?? `Erreur ${res.status}`)
      if (json) onChange(json)
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (received) {
    // Un encaissement Stripe n'a rien à annuler ici : c'est le webhook qui l'a
    // posé, et l'argent est bien arrivé.
    if (!declared) return null
    return (
      <button
        type="button"
        onClick={() => submit(false)}
        disabled={saving}
        className="cursor-pointer text-[11px] text-ink-3 underline-offset-2 transition-colors hover:text-red-400 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Annulation…' : `Annuler l’encaissement de l’${what}`}
      </button>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3 py-2 text-[12px] font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-amber"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 7l4 4 8-8" />
        </svg>
        Déclarer l’{what} reçu
      </button>
    )
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-[var(--line-2)] bg-bg-2/50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
        {what} reçu hors Stripe
      </p>

      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-ink-3">Montant (€)</label>
        <input
          type="number" min="0" step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="150"
          className="w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-ink-3">Date d’encaissement</label>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
          className="w-full cursor-pointer rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 focus:border-amber/50 focus:outline-none"
        />
        <p className="mt-1 text-[10px] leading-relaxed text-ink-3">
          Celle du relevé bancaire : c’est elle qui compte pour la déclaration.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-ink-3">Moyen</label>
        <Select
          value={method}
          onChange={(v) => setMethod(v as PaymentMethod)}
          options={MANUAL_PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
          compact
        />
      </div>

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => submit(true)}
          disabled={saving || !cents(amount)}
          className="flex h-9 cursor-pointer items-center rounded-pill px-4 text-[12px] font-bold text-bg-0 transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--btn-primary-bg)' }}
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null) }}
          className="cursor-pointer text-[12px] text-ink-3 transition-colors hover:text-ink-1"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}
