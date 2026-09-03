'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Select from '@/components/ui/Select'
import PaymentModeToggle, { type QuotePaymentMode } from './PaymentModeToggle'
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
 * L'argent : ce qui est réclamé, ce qui est arrivé, quand et par quel moyen.
 *
 * Seul endroit de la fiche où l'on touche aux encaissements — la carte « Devis »
 * s'occupe du document et de ses montants, celle-ci de leur vie ensuite :
 * réclamer le solde, déclarer un règlement reçu. Les deux se marchaient dessus
 * tant que le solde avait sa propre carte.
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
  const balanceAmount = order.balance_amount ?? balanceDue

  return (
    <div className="space-y-4 text-sm">
      {/* ── Acompte ── */}
      <section className="space-y-2">
        {order.deposit_amount !== null ? (
          <PaymentLine
            label="Acompte"
            amount={order.deposit_amount}
            received={pay.depositPaid}
            at={pay.depositPaidAt}
            method={pay.depositMethod}
            pendingLabel={order.payment_url ? 'lien envoyé, en attente' : 'en attente de règlement'}
          />
        ) : (
          <p className="text-[13px] text-ink-3">Aucun acompte défini pour l’instant.</p>
        )}

        <Receipt
          order={order}
          kind="deposit"
          received={pay.depositPaid}
          declared={!!pay.depositPaidAt}
          defaultAmount={order.deposit_amount}
          onChange={onChange}
        />

        {!order.total_amount && !pay.depositPaid && (
          <p className="text-[11px] leading-relaxed text-ink-3">
            Demande négociée ailleurs ? Enregistre ici l’acompte déjà reçu, sans rien envoyer au client.
          </p>
        )}
      </section>

      {/* ── Solde : rien à réclamer tant que l’acompte n’est pas encaissé,
             la production n’étant pas lancée. ── */}
      {pay.depositPaid && (
        <section className="space-y-2 border-t border-[var(--line)] pt-4">
          {balanceAmount ? (
            <PaymentLine
              label="Solde"
              amount={balanceAmount}
              received={pay.balancePaid}
              at={pay.balancePaidAt}
              method={pay.balanceMethod}
              pendingLabel={order.balance_payment_url ? 'demande envoyée, en attente' : 'pas encore réclamé'}
            />
          ) : (
            <p className="text-[13px] text-ink-3">Solde : rien à réclamer après l’acompte.</p>
          )}

          {!pay.balancePaid && <BalanceRequest order={order} onChange={onChange} />}

          <Receipt
            order={order}
            kind="balance"
            received={pay.balancePaid}
            declared={!!pay.balancePaidAt}
            defaultAmount={balanceAmount}
            onChange={onChange}
          />
        </section>
      )}

      {/* ── Récapitulatif ── */}
      {order.total_amount && (
        <div className="space-y-1 border-t border-dashed pt-3" style={{ borderColor: 'var(--line-amber)' }}>
          <div className="flex items-baseline justify-between">
            <span className="text-ink-2">Encaissé</span>
            <span className="font-mono font-semibold text-ink-0">{formatPrice(pay.amountPaid)}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-semibold text-amber">Total du devis</span>
            <span className="font-mono text-base font-bold text-amber">{formatPrice(order.total_amount)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Réclamer le solde au client : second Checkout Stripe, ou simple demande quand
 * le règlement se fait par virement. Envoyé quand la pièce est prête, juste
 * avant l'expédition — l'acompte a lancé la production, le solde la libère.
 */
function BalanceRequest({
  order,
  onChange,
}: {
  order: CustomOrder
  onChange: (order: CustomOrder) => void
}) {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [amount, setAmount]   = useState(() => {
    const due = computeBalance(order)
    return due ? String(due / 100) : ''
  })
  const [mode, setMode]       = useState<QuotePaymentMode>('stripe')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function send() {
    const value = cents(amount)
    if (!value) {
      setError('Montant du solde requis')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/custom/${order.id}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance_amount: value, payment_mode: mode }),
      })
      const json = await res.json().catch(() => null) as
        { error?: string; payment_url?: string | null; balance_amount?: number } | null
      if (!res.ok) throw new Error(json?.error ?? 'Erreur inattendue')
      onChange({
        ...order,
        balance_amount:      json?.balance_amount ?? value,
        balance_payment_url: json?.payment_url ?? null,
      })
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <div className="space-y-1.5">
        {order.balance_payment_url && (
          <a
            href={order.balance_payment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-amber hover:underline"
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3h6v6M11 3L3 11" />
            </svg>
            Voir le lien de paiement du solde
          </a>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--line-2)] px-3 py-2 text-[12px] font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-amber"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2L2 6.5l5 2L9 14l5-12z" />
          </svg>
          {order.balance_payment_url ? 'Renvoyer la demande de solde' : 'Réclamer le solde au client'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-[var(--line-2)] bg-bg-2/50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Demande de solde</p>

      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-ink-3">Montant (€)</label>
        <input
          type="number" min="1" step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="200"
          className="w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
        />
        <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
          {computeBalance(order)
            ? 'Pré-rempli avec le total du devis moins l’acompte. Ajustable si le projet a évolué.'
            : 'Renseigne le total dans la carte « Devis » pour un pré-remplissage automatique.'}
        </p>
      </div>

      <PaymentModeToggle value={mode} onChange={setMode} />

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={send}
          disabled={loading}
          className="flex h-9 cursor-pointer items-center rounded-pill px-4 text-[12px] font-bold text-bg-0 transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--btn-primary-bg)' }}
        >
          {loading ? 'Envoi…' : mode === 'transfer' ? 'Envoyer la demande (virement)' : 'Envoyer la demande + lien'}
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
  const [total, setTotal]   = useState('')
  const [date, setDate]     = useState(today())
  const [method, setMethod] = useState<PaymentMethod>('transfer')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const what = kind === 'deposit' ? 'acompte' : 'solde'
  // Demande négociée hors de l'app : la carte « Devis » n'a rien produit, donc
  // personne n'a dit ce que vaut le projet, et sans ce chiffre le solde comme la
  // facture restent aveugles. Champ masqué dès qu'un total existe : les deux
  // cartes ne doivent jamais proposer la même saisie en même temps.
  const needsTotal = kind === 'deposit' && !order.total_amount

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
          ...(isReceived
            ? {
                amount: cents(amount) || undefined,
                paid_at: date,
                method,
                ...(needsTotal && cents(total) ? { total_amount: cents(total) } : {}),
              }
            : {}),
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

      {needsTotal && (
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-ink-3">Total du devis (€)</label>
          <input
            type="number" min="0" step="0.01"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="350"
            className="w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
          />
          <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
            {cents(total)
              ? `Reste ${formatPrice(Math.max(0, cents(total) - cents(amount)))} à réclamer en solde.`
              : 'Le même que dans la carte « Devis », à saisir ici quand aucun devis n’est passé par l’app. Sans lui, ni solde déduit ni facture chiffrée.'}
          </p>
        </div>
      )}

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
