'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CUSTOM_STATUS_LABELS, computeBalance, type CustomOrder, type CustomOrderStatus } from '@/types/custom-order'
import { formatPrice } from '@/lib/utils'
import { CUSTOM_STATUS_PILL, CUSTOM_STATUS_ACCENT } from '@/lib/status-ui'
import { useAdminMutation } from './useAdminMutation'
import AdminFeedback, { UnsavedDot } from './AdminFeedback'
import useUnsavedWarning from './useUnsavedWarning'

const MANUAL_STATUSES: CustomOrderStatus[] = [
  'pending_quote', 'quote_sent', 'deposit_paid', 'in_production', 'shipped', 'delivered', 'cancelled',
]

// Le solde ne se réclame qu'une fois l'acompte encaissé — avant, c'est le devis
// qui est en jeu, pas le reste à payer.
const BALANCE_STATUSES: CustomOrderStatus[] = ['deposit_paid', 'in_production', 'shipped', 'delivered']

export default function AdminCustomOrderDetail({ order: initialOrder }: { order: CustomOrder }) {
  const [order, setOrder]               = useState(initialOrder)
  const { mutate, loading: saving, error: mutationError, success: successMsg, clear } = useAdminMutation()
  const [notesInput, setNotesInput]     = useState(order.admin_notes ?? '')
  const [trackingNum, setTrackingNum]   = useState(order.tracking_number ?? '')
  const [trackingUrl, setTrackingUrl]   = useState(order.tracking_url ?? '')
  const [depositInput, setDepositInput] = useState(order.deposit_amount ? String(order.deposit_amount / 100) : '')
  const [totalInput, setTotalInput]     = useState(order.total_amount ? String(order.total_amount / 100) : '')
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError]     = useState<string | null>(null)
  const [quoteSent, setQuoteSent]       = useState(false)
  const [balanceInput, setBalanceInput]     = useState(() => {
    const due = computeBalance(initialOrder)
    return due ? String(due / 100) : ''
  })
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [balanceError, setBalanceError]     = useState<string | null>(null)
  const router = useRouter()

  const status = order.status as CustomOrderStatus
  const suiviUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/custom/${order.id}`

  const notesDirty    = notesInput !== (order.admin_notes ?? '')
  const trackingDirty = trackingNum !== (order.tracking_number ?? '') || trackingUrl !== (order.tracking_url ?? '')
  useUnsavedWarning(notesDirty || trackingDirty)

  async function updateField(updates: Partial<CustomOrder>, successMessage = 'Sauvegardé') {
    const updated = await mutate<CustomOrder>(`/api/admin/custom/${order.id}`, {
      body: updates,
      successMessage,
    })
    if (updated) setOrder(updated)
  }

  async function sendQuote() {
    const depositCents = Math.round(parseFloat(depositInput) * 100)
    const totalCents   = totalInput ? Math.round(parseFloat(totalInput) * 100) : undefined

    if (!depositCents || isNaN(depositCents)) {
      setQuoteError('Montant de l\'acompte requis')
      return
    }

    setQuoteLoading(true)
    setQuoteError(null)
    try {
      const res = await fetch(`/api/custom/${order.id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deposit_amount: depositCents, total_amount: totalCents }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erreur inattendue')
      setQuoteSent(true)
      setOrder((o) => ({ ...o, status: 'quote_sent' }))
      router.refresh()
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setQuoteLoading(false)
    }
  }

  async function sendBalance() {
    const cents = Math.round(parseFloat(balanceInput) * 100)
    if (!cents || isNaN(cents)) {
      setBalanceError('Montant du solde requis')
      return
    }

    setBalanceLoading(true)
    setBalanceError(null)
    try {
      const res = await fetch(`/api/custom/${order.id}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance_amount: cents }),
      })
      const json = await res.json() as { error?: string; payment_url?: string; balance_amount?: number }
      if (!res.ok) throw new Error(json.error ?? 'Erreur inattendue')
      setOrder((o) => ({
        ...o,
        balance_amount:      json.balance_amount ?? cents,
        balance_payment_url: json.payment_url ?? null,
      }))
      router.refresh()
    } catch (e) {
      setBalanceError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBalanceLoading(false)
    }
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-10">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Link
            href="/admin/commandes"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line-2)] bg-bg-1 text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-amber"
            aria-label="Retour à la liste"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 7H3M3 7l3.5-3.5M3 7l3.5 3.5" />
            </svg>
          </Link>

          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-mono text-lg font-bold text-ink-2"
            style={{ background: 'var(--hi-04)', border: '1px solid var(--line)' }}
          >
            {order.name.slice(0, 2).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 className="truncate text-lg font-bold text-ink-0" style={{ letterSpacing: '-0.01em' }}>
                {order.company ?? order.name}
              </h1>
              <span className={['shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold', CUSTOM_STATUS_PILL[status]].join(' ')}>
                {CUSTOM_STATUS_LABELS[status]}
              </span>
            </div>
            <p className="mt-0.5 font-mono text-[11px] text-ink-3">
              #{order.id.slice(0, 8).toUpperCase()} · {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <a
            href={`/custom/${order.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-pill border border-[var(--line-2)] px-4 py-2 text-xs font-medium text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-ink-1 sm:w-auto"
          >
            Suivi client
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3h6v6M11 3L3 11" />
            </svg>
          </a>
        </div>

        <AdminFeedback error={mutationError} success={successMsg} onDismiss={clear} />

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">

          {/* ════ Colonne principale ════ */}
          <div className="space-y-5">

            {/* Statut */}
            <Card title="Statut">
              <div className="flex flex-wrap gap-2">
                {MANUAL_STATUSES.map((s) => {
                  const active = order.status === s
                  return (
                    <button
                      key={s}
                      disabled={saving || active}
                      onClick={() => updateField({ status: s })}
                      className="flex cursor-pointer items-center gap-1.5 rounded-pill border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default"
                      style={active ? {
                        background: `color-mix(in srgb, ${CUSTOM_STATUS_ACCENT[s]} 12%, transparent)`,
                        borderColor: `color-mix(in srgb, ${CUSTOM_STATUS_ACCENT[s]} 55%, transparent)`,
                        color: CUSTOM_STATUS_ACCENT[s],
                      } : { borderColor: 'var(--line-2)', color: 'var(--ink-2)' }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: CUSTOM_STATUS_ACCENT[s] }} />
                      {CUSTOM_STATUS_LABELS[s]}
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Projet */}
            <Card title="Projet">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <InfoItem label="Type" value={order.project_type} />
                  {order.budget_range && <InfoItem label="Budget" value={order.budget_range} />}
                  {order.deadline && <InfoItem label="Délai" value={order.deadline} />}
                </div>
                <div
                  className="rounded-xl p-4 text-sm leading-relaxed text-ink-1"
                  style={{ background: 'var(--hi-03)', border: '1px solid var(--line)' }}
                >
                  {order.description}
                </div>
                {order.reference_file_url && (
                  <a
                    href={order.reference_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-pill border border-amber/30 bg-amber/10 px-3.5 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/20"
                  >
                    📎 Voir le fichier de référence
                  </a>
                )}
              </div>
            </Card>

            {/* Devis & paiement */}
            <Card title="Devis & paiement">
              {quoteSent ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 7l3.5 3.5L12 4" />
                  </svg>
                  Devis envoyé — lien de paiement transmis par email.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                        Acompte (€) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={depositInput}
                        onChange={(e) => setDepositInput(e.target.value)}
                        placeholder="150"
                        className="w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                        Total estimé (€)
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={totalInput}
                        onChange={(e) => setTotalInput(e.target.value)}
                        placeholder="350"
                        className="w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
                      />
                    </div>
                  </div>
                  {quoteError && <p className="text-xs text-red-400">{quoteError}</p>}
                  <button
                    onClick={sendQuote}
                    disabled={quoteLoading || !depositInput}
                    className="flex h-[42px] cursor-pointer items-center gap-2 rounded-pill px-5 text-[13px] font-bold text-bg-0 transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ background: 'var(--btn-primary-bg)' }}
                  >
                    {quoteLoading ? (
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
                        Envoyer le devis + lien de paiement
                      </>
                    )}
                  </button>
                  {order.payment_url && (
                    <a
                      href={order.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-amber hover:underline"
                    >
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 3h6v6M11 3L3 11" />
                      </svg>
                      Voir le lien de paiement existant
                    </a>
                  )}
                </div>
              )}
            </Card>

            {/* Solde — réclamé quand la pièce est prête, avant de l'expédier */}
            {BALANCE_STATUSES.includes(status) && (
              <Card title="Solde">
                {order.balance_paid_at ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 7l3.5 3.5L12 4" />
                    </svg>
                    Solde réglé{order.balance_amount ? ` (${formatPrice(order.balance_amount)})` : ''} le{' '}
                    {new Date(order.balance_paid_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} — prêt à expédier.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {order.balance_payment_url && (
                      <div className="rounded-lg border border-amber/30 bg-amber/10 px-4 py-3">
                        <p className="text-[13px] font-medium text-amber">
                          Demande envoyée{order.balance_amount ? ` — ${formatPrice(order.balance_amount)}` : ''}. En attente du règlement.
                        </p>
                        <a
                          href={order.balance_payment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 flex items-center gap-1.5 text-xs text-amber hover:underline"
                        >
                          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 3h6v6M11 3L3 11" />
                          </svg>
                          Voir le lien de paiement
                        </a>
                      </div>
                    )}

                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-3">
                        Montant du solde (€) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={balanceInput}
                        onChange={(e) => setBalanceInput(e.target.value)}
                        placeholder="200"
                        className="w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-3 focus:border-amber/50 focus:outline-none"
                      />
                      <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
                        {computeBalance(order)
                          ? `Pré-rempli avec le total estimé moins l'acompte. Ajustable si le projet a évolué.`
                          : `Renseigne le total estimé dans le devis pour un pré-remplissage automatique.`}
                      </p>
                    </div>

                    {balanceError && <p className="text-xs text-red-400">{balanceError}</p>}

                    <button
                      onClick={sendBalance}
                      disabled={balanceLoading || !balanceInput}
                      className="flex h-[42px] cursor-pointer items-center gap-2 rounded-pill px-5 text-[13px] font-bold text-bg-0 transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: 'var(--btn-primary-bg)' }}
                    >
                      {balanceLoading ? (
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
                          {order.balance_payment_url ? 'Renvoyer la demande de solde' : 'Envoyer la demande de solde'}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </Card>
            )}

            {/* Expédition */}
            <Card title="Expédition">
              {order.shipping_address ? (
                <div className="space-y-4">
                  <address className="text-[13px] not-italic leading-relaxed text-ink-1">
                    <span className="font-semibold text-ink-0">{order.shipping_name}</span><br />
                    {order.shipping_address}<br />
                    {order.shipping_postal_code} {order.shipping_city}
                  </address>
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Numéro de suivi</p>
                      {trackingDirty && <UnsavedDot />}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={trackingNum}
                        onChange={(e) => setTrackingNum(e.target.value)}
                        placeholder="Numéro transporteur"
                        className={[
                          'min-w-0 flex-1 rounded-lg border bg-bg-2 px-3 py-2 font-mono text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none',
                          trackingDirty ? 'border-amber/50' : 'border-[var(--line-2)] focus:border-amber/50',
                        ].join(' ')}
                      />
                      <button
                        onClick={() => updateField({ tracking_number: trackingNum, tracking_url: trackingUrl })}
                        disabled={saving || !trackingDirty}
                        className="cursor-pointer rounded-lg border border-[var(--line-2)] bg-bg-3 px-4 py-2 text-sm font-medium text-ink-1 transition-colors hover:border-[var(--line-amber)] hover:text-ink-0 disabled:cursor-default disabled:opacity-40"
                      >
                        {saving ? '…' : 'Sauver'}
                      </button>
                    </div>
                    <input
                      value={trackingUrl}
                      onChange={(e) => setTrackingUrl(e.target.value)}
                      placeholder="URL de suivi (optionnel)"
                      className={[
                        'mt-2 w-full rounded-lg border bg-bg-2 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none',
                        trackingDirty ? 'border-amber/50' : 'border-[var(--line-2)] focus:border-amber/50',
                      ].join(' ')}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-ink-3">Aucune adresse de livraison renseignée.</p>
              )}
            </Card>
          </div>

          {/* ════ Colonne latérale ════ */}
          <div className="space-y-5">

            {/* Client */}
            <Card title="Client">
              <p className="text-sm font-semibold text-ink-0">{order.name}</p>
              {order.company && <p className="mt-0.5 text-xs text-ink-3">{order.company}</p>}
              <div className="mt-3 space-y-2">
                <a href={`mailto:${order.email}`} className="flex items-center gap-2 text-[13px] text-amber hover:underline">
                  <svg className="shrink-0 text-ink-3" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="M2 5l6 4 6-4" />
                  </svg>
                  <span className="truncate">{order.email}</span>
                </a>
                {/* Chaîne vide = demande saisie à la main sans numéro : un lien
                    `tel:` vide n'aurait rien à composer. */}
                {order.phone && (
                  <a href={`tel:${order.phone}`} className="flex items-center gap-2 text-[13px] text-amber hover:underline">
                    <svg className="shrink-0 text-ink-3" width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3.5 2.5h2l1.3 3.3-1.6 1a7 7 0 003.3 3.3l1-1.6 3.3 1.3v2a1.3 1.3 0 01-1.3 1.3A10.7 10.7 0 012.2 3.8 1.3 1.3 0 013.5 2.5z" />
                    </svg>
                    {order.phone}
                  </a>
                )}
              </div>
            </Card>

            {/* Finances */}
            {(order.deposit_amount || order.total_amount || order.balance_amount) && (
              <Card title="Finances">
                <div className="space-y-2 text-sm">
                  {order.deposit_amount && (
                    <div className="flex items-baseline justify-between">
                      <span className="text-ink-2">Acompte</span>
                      <span className="font-mono text-ink-1">{formatPrice(order.deposit_amount)}</span>
                    </div>
                  )}
                  {order.balance_amount && (
                    <div className="flex items-baseline justify-between">
                      <span className="text-ink-2">
                        Solde
                        <span className={['ml-1.5 text-[11px]', order.balance_paid_at ? 'text-emerald-400' : 'text-ink-3'].join(' ')}>
                          {order.balance_paid_at ? '· réglé' : '· en attente'}
                        </span>
                      </span>
                      <span className="font-mono text-ink-1">{formatPrice(order.balance_amount)}</span>
                    </div>
                  )}
                  {order.total_amount && (
                    <>
                      <div className="my-1 border-t border-dashed" style={{ borderColor: 'var(--line-amber)' }} />
                      <div className="flex items-baseline justify-between">
                        <span className="font-semibold text-amber">Total estimé</span>
                        <span className="font-mono text-base font-bold text-amber">{formatPrice(order.total_amount)}</span>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* Notes internes */}
            <Card title="Notes internes" right={notesDirty ? <UnsavedDot /> : undefined}>
              <textarea
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                rows={4}
                placeholder="Notes de production, contraintes, todo…"
                className={[
                  'w-full resize-none rounded-lg border bg-bg-2 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none',
                  notesDirty ? 'border-amber/50' : 'border-[var(--line-2)] focus:border-amber/50',
                ].join(' ')}
              />
              <button
                onClick={() => updateField({ admin_notes: notesInput }, 'Notes sauvegardées')}
                disabled={saving || !notesDirty}
                className="mt-2 cursor-pointer rounded-lg border border-[var(--line-2)] bg-bg-3 px-4 py-2 text-sm text-ink-1 transition-colors hover:border-[var(--line-amber)] hover:text-ink-0 disabled:cursor-default disabled:opacity-40"
              >
                {saving ? 'Sauvegarde…' : 'Sauvegarder les notes'}
              </button>
            </Card>

            {/* Lien suivi client */}
            <Card title="Lien de suivi client">
              <p className="break-all font-mono text-xs leading-relaxed text-ink-2">{suiviUrl}</p>
              <button
                onClick={() => navigator.clipboard.writeText(suiviUrl)}
                className="mt-2.5 flex cursor-pointer items-center gap-1.5 text-xs font-medium text-amber transition-colors hover:text-amber-soft"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="5" width="7" height="7" rx="1.2" /><path d="M9 5V3.2A1.2 1.2 0 007.8 2H3.2A1.2 1.2 0 002 3.2v4.6A1.2 1.2 0 003.2 9H5" />
                </svg>
                Copier le lien
              </button>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}

function Card({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-1">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3 sm:px-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{title}</h2>
        {right}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-1 text-[13px] text-ink-1">{value}</p>
    </div>
  )
}
