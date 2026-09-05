'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BUDGET_RANGES,
  CUSTOM_STATUS_LABELS,
  DEADLINES,
  PROJECT_TYPES,
  paymentState,
  projectTypeLabel,
  type CustomOrder,
  type CustomOrderStatus,
} from '@/types/custom-order'
import { formatPrice } from '@/lib/utils'
import { CUSTOM_STATUS_PILL, CUSTOM_STATUS_ACCENT } from '@/lib/status-ui'
import { useAdminMutation } from './useAdminMutation'
import AdminFeedback, { UnsavedDot } from './AdminFeedback'
import useUnsavedWarning from './useUnsavedWarning'
import AdminQuoteComposer from './AdminQuoteComposer'
import AdminQuoteImport from './AdminQuoteImport'
import AdminCustomPayments from './AdminCustomPayments'
import AdminCustomShipping from './AdminCustomShipping'
import AdminCustomFields, { type EditableField } from './AdminCustomFields'

const MANUAL_STATUSES: CustomOrderStatus[] = [
  'pending_quote', 'quote_sent', 'deposit_paid', 'in_production', 'shipped', 'delivered', 'cancelled',
]

/** Devis composé dans l'app, ou PDF fabriqué ailleurs et importé. */
type QuoteMode = 'compose' | 'import'

const QUOTE_MODES: { value: QuoteMode; label: string }[] = [
  { value: 'compose', label: 'Composer le devis' },
  { value: 'import',  label: 'Importer un PDF' },
]

/** Bloc de la fiche en cours d'édition. Un seul à la fois : deux formulaires
 *  ouverts, c'est une saisie qu'on oublie de valider. */
type EditSection = 'project' | 'client' | 'address'

const UNSET = { value: '', label: 'Non précisé' }

const PROJECT_FIELDS: EditableField[] = [
  {
    key: 'project_type', label: 'Type de projet', required: true,
    options: PROJECT_TYPES.map(({ value, label }) => ({ value, label })),
    placeholder: 'Choisir un type',
  },
  { key: 'budget_range', label: 'Budget',  options: [UNSET, ...BUDGET_RANGES.map((b) => ({ value: b, label: b }))] },
  { key: 'deadline',     label: 'Délai',   options: [UNSET, ...DEADLINES.map((d) => ({ value: d, label: d }))] },
  {
    key: 'description', label: 'Description', type: 'textarea', required: true, full: true,
    placeholder: 'Ce que le client demande, dimensions, matière, quantité, contraintes…',
  },
]

const CLIENT_FIELDS: EditableField[] = [
  { key: 'name',    label: 'Nom',        required: true, placeholder: 'Jean Dupont' },
  { key: 'company', label: 'Société',    placeholder: 'Optionnel' },
  { key: 'email',   label: 'Email',      required: true, type: 'email', placeholder: 'vous@exemple.fr' },
  { key: 'phone',   label: 'Téléphone',  type: 'tel', placeholder: 'Optionnel' },
]

const ADDRESS_FIELDS: EditableField[] = [
  { key: 'shipping_name',        label: 'Destinataire', full: true, placeholder: 'Jean Dupont' },
  { key: 'shipping_address',     label: 'Adresse',      full: true, placeholder: '12 rue des Lilas' },
  { key: 'shipping_postal_code', label: 'Code postal',  placeholder: '75001' },
  { key: 'shipping_city',        label: 'Ville',        placeholder: 'Paris' },
]

export default function AdminCustomOrderDetail({ order: initialOrder }: { order: CustomOrder }) {
  const [order, setOrder]               = useState(initialOrder)
  const { mutate, loading: saving, error: mutationError, success: successMsg, clear } = useAdminMutation()
  const [notesInput, setNotesInput]     = useState(order.admin_notes ?? '')
  const [trackingNum, setTrackingNum]   = useState(order.tracking_number ?? '')
  const [trackingUrl, setTrackingUrl]   = useState(order.tracking_url ?? '')
  const [quoteSent, setQuoteSent]       = useState(false)
  // Un PDF déjà téléversé dit de lui-même quel mode la demande utilise.
  const [quoteMode, setQuoteMode]       = useState<QuoteMode>(initialOrder.quote_pdf_path ? 'import' : 'compose')
  const [editing, setEditing]           = useState<EditSection | null>(null)

  const status = order.status as CustomOrderStatus
  const pay = paymentState(order)
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
            <Card
              title="Projet"
              right={editing === 'project' ? undefined : <EditButton onClick={() => setEditing('project')} />}
            >
              {editing === 'project' ? (
                <AdminCustomFields
                  order={order}
                  fields={PROJECT_FIELDS}
                  onSaved={setOrder}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {/* La base stocke le slug (`deco`) : sans son libellé, la fiche
                        affichait un mot de code. */}
                    <InfoItem label="Type" value={projectTypeLabel(order.project_type)} />
                    {order.budget_range && <InfoItem label="Budget" value={order.budget_range} />}
                    {order.deadline && <InfoItem label="Délai" value={order.deadline} />}
                  </div>
                  <div
                    className="whitespace-pre-line rounded-xl p-4 text-sm leading-relaxed text-ink-1"
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
              )}
            </Card>

            {/* Devis — le document et ses montants. L'argent réellement
                encaissé se règle dans « Paiements », juste en dessous. */}
            <Card
              title="Devis"
              right={order.quote_number
                ? <span className="font-mono text-[11px] font-semibold text-amber">{order.quote_number}</span>
                : undefined}
            >
              <div className="space-y-4">
                {/* `quote_issued_at` et non `quote_number` : un devis simplement
                    enregistré porte un numéro sans avoir été envoyé, le bandeau
                    mentirait. */}
                {(quoteSent || order.quote_issued_at) && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                    <p className="flex items-center gap-2 text-sm text-emerald-400">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 7l3.5 3.5L12 4" />
                      </svg>
                      Devis envoyé{order.quote_issued_at
                        ? ` le ${new Date(order.quote_issued_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`
                        : ''} — PDF joint à l’email.
                    </p>
                    {(order.quote_number || order.quote_pdf_path) && (
                      <a
                        href={`/api/admin/custom/${order.id}/quote-pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-pill border border-amber/30 bg-amber/10 px-3.5 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/20"
                      >
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9.5 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5l-3.5-3.5z" /><path d="M9.5 1.5V5H13" />
                        </svg>
                        Voir le devis (PDF)
                      </a>
                    )}
                  </div>
                )}

                <div className="flex w-fit gap-1 rounded-pill border border-[var(--line-2)] p-1">
                  {QUOTE_MODES.map(({ value, label }) => {
                    const active = quoteMode === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setQuoteMode(value)}
                        className={[
                          'cursor-pointer rounded-pill px-3.5 py-1.5 text-xs font-medium transition-colors',
                          active ? 'bg-amber/10 text-amber' : 'text-ink-3 hover:text-ink-1',
                        ].join(' ')}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>

                {quoteMode === 'compose' ? (
                  <AdminQuoteComposer
                    order={order}
                    onSaved={setOrder}
                    onSent={(patch) => {
                      setQuoteSent(true)
                      setOrder((o) => ({ ...o, ...patch }))
                    }}
                  />
                ) : (
                  <AdminQuoteImport
                    order={order}
                    onChange={(patch) => setOrder((o) => ({ ...o, ...patch }))}
                    onSent={(patch) => {
                      setQuoteSent(true)
                      setOrder((o) => ({ ...o, ...patch }))
                    }}
                  />
                )}

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
                    Voir le lien de paiement de l’acompte
                  </a>
                )}
              </div>
            </Card>

            {/* Paiements — qui a payé quoi, quand, et par quel moyen */}
            <Card
              title="Paiements"
              right={pay.fullyPaid
                ? <span className="rounded-pill bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Soldé</span>
                : pay.outstanding
                  ? <span className="rounded-pill bg-amber/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber">Reste {formatPrice(pay.outstanding)}</span>
                  : undefined}
            >
              <AdminCustomPayments order={order} onChange={setOrder} />
            </Card>

            {/* Expédition */}
            <Card
              title="Expédition"
              right={
                <div className="flex items-center gap-2.5">
                  {order.boxtal_order_id && (
                    <span className="font-mono text-[10px] text-ink-3">{order.boxtal_order_id}</span>
                  )}
                  {editing !== 'address' && (
                    <EditButton
                      label={order.shipping_address ? 'Modifier' : 'Ajouter'}
                      onClick={() => setEditing('address')}
                    />
                  )}
                </div>
              }
            >
              {editing === 'address' ? (
                <AdminCustomFields
                  order={order}
                  fields={ADDRESS_FIELDS}
                  note="L’étiquette Boxtal se fabrique à partir de cette adresse : destinataire, rue, code postal et ville doivent tous être renseignés."
                  onSaved={setOrder}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="space-y-4">
                  {order.shipping_address ? (
                    <address className="text-[13px] not-italic leading-relaxed text-ink-1">
                      <span className="font-semibold text-ink-0">{order.shipping_name}</span><br />
                      {order.shipping_address}<br />
                      {order.shipping_postal_code} {order.shipping_city}
                    </address>
                  ) : (
                    <p className="text-xs text-ink-3">
                      Aucune adresse de livraison renseignée. « Ajouter » pour la saisir, une fois
                      qu’elle est connue.
                    </p>
                  )}

                  {/* Boxtal a besoin d'une adresse complète : sans elle, pas
                      d'étiquette à proposer. Le suivi manuel reste dispo, il
                      couvre la remise en main propre. */}
                  {order.shipping_address && (
                    <AdminCustomShipping
                      order={order}
                      onShipped={(patch) => setOrder((o) => ({ ...o, ...patch }))}
                    />
                  )}

                  <div className="border-t border-[var(--line)] pt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Suivi manuel</p>
                      {trackingDirty && <UnsavedDot />}
                    </div>
                    <p className="mb-2 text-[11px] leading-relaxed text-ink-3">
                      Pour une expédition faite hors Boxtal (dépôt en bureau de poste, remise en main propre) :
                      le webhook remplit ces champs tout seul sinon.
                    </p>
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
              )}
            </Card>
          </div>

          {/* ════ Colonne latérale ════ */}
          <div className="space-y-5">

            {/* Client */}
            <Card
              title="Client"
              right={editing === 'client' ? undefined : <EditButton onClick={() => setEditing('client')} />}
            >
              {editing === 'client' ? (
                <AdminCustomFields
                  order={order}
                  fields={CLIENT_FIELDS}
                  columns={1}
                  note="L’email sert au devis, au lien de paiement et aux emails de suivi : le corriger ici redirige tout ce qui partira ensuite."
                  onSaved={setOrder}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <>
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
                </>
              )}
            </Card>

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
              {/* Cliquable aussi côté admin : c'est le moyen le plus court de
                  voir la page telle que le client la reçoit. Chemin relatif en
                  `href`, l'URL affichée n'étant connue qu'après hydratation. */}
              <a
                href={`/custom/${order.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block cursor-pointer break-all font-mono text-xs leading-relaxed text-ink-2 underline-offset-2 transition-colors hover:text-amber hover:underline"
              >
                {suiviUrl}
              </a>
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

/** Ouvre l'édition d'un bloc, posé dans l'en-tête de sa carte. */
function EditButton({ label = 'Modifier', onClick }: { label?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-pill border border-[var(--line-2)] px-2.5 py-1 text-[11px] font-medium text-ink-3 transition-colors hover:border-[var(--line-amber)] hover:text-amber"
    >
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13l.5-2.5 7-7 2 2-7 7L3 13zM10 3.5l2 2" />
      </svg>
      {label}
    </button>
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
