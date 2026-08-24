'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { PromoCode, PromoScope, PromoType } from '@/types/promo'
import { promoLabel, promoIsSpent, normalizeCode } from '@/lib/promo'
import { formatPrice } from '@/lib/utils'
import Select from '@/components/ui/Select'
import Tooltip from '@/components/ui/Tooltip'
import { useConfirm } from '@/components/ui/ConfirmModal'
import { useAdminMutation } from './useAdminMutation'
import AdminFeedback from './AdminFeedback'

/**
 * Codes promo de la boutique.
 *
 * Trois natures de remise, parce qu'elles ne se rattrapent pas l'une l'autre :
 * un pourcentage suit le panier, un montant fixe est lisible en communication
 * (« 5 € offerts »), et la livraison gratuite est la seule qui touche le port —
 * impossible à faire avec un coupon Stripe, d'où la table maison.
 */

export type PromoUsage = { count: number; amount: number }

const TYPE_OPTIONS = [
  { value: 'percent',       label: 'Pourcentage de remise' },
  { value: 'amount',        label: 'Montant fixe offert' },
  { value: 'free_shipping', label: 'Livraison gratuite' },
]

const SCOPE_OPTIONS = [
  { value: 'all',      label: 'Tout le panier' },
  { value: 'physical', label: 'Objets uniquement' },
  { value: 'digital',  label: 'Fichiers uniquement' },
]

const SCOPE_LABEL: Record<PromoScope, string> = {
  all:      '',
  physical: 'objets seulement',
  digital:  'fichiers seulement',
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })

/** ISO → valeur d'un <input type="date"> (heure locale). */
function toDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Une date de fin saisie « 30/09 » veut dire « valable tout le 30 » : sans la
 * borne à 23:59:59, le code expirerait à minuit la veille au soir.
 */
function fromDateInput(value: string, endOfDay = false): string | null {
  if (!value) return null
  const d = new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export default function AdminPromoCodes({
  promos: initialPromos,
  usage,
}: {
  promos: PromoCode[]
  usage: Record<string, PromoUsage>
}) {
  const { confirm, modal } = useConfirm()
  const { mutate, error, success, clear } = useAdminMutation()
  const [promos, setPromos]   = useState(initialPromos)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [busyId, setBusyId]   = useState<string | null>(null)

  const stats = useMemo(() => {
    const now = new Date()
    const live = promos.filter((p) => !promoIsSpent(p, now))
    const totals = Object.values(usage).reduce(
      (acc, u) => ({ count: acc.count + u.count, amount: acc.amount + u.amount }),
      { count: 0, amount: 0 },
    )
    return { live: live.length, ...totals }
  }, [promos, usage])

  async function toggleActive(promo: PromoCode) {
    setBusyId(promo.id)
    const ok = await mutate(`/api/admin/boutique/promos/${promo.id}`, {
      method: 'PATCH',
      body: { active: !promo.active },
      successMessage: promo.active ? `« ${promo.code} » désactivé` : `« ${promo.code} » activé`,
    })
    setBusyId(null)
    if (ok) setPromos((prev) => prev.map((p) => p.id === promo.id ? { ...p, active: !p.active } : p))
  }

  async function remove(promo: PromoCode) {
    const used = usage[promo.id]?.count ?? 0
    const confirmed = await confirm({
      title: `Supprimer « ${promo.code} » ?`,
      message: used > 0
        ? `Ce code a déjà servi ${used} fois : il sera désactivé et non supprimé, pour garder l’historique des commandes lisible.`
        : 'Ce code n’a jamais servi, il sera supprimé définitivement.',
      confirmLabel: used > 0 ? 'Désactiver' : 'Supprimer',
      variant: 'danger',
    })
    if (!confirmed) return

    setBusyId(promo.id)
    const res = await mutate<{ deleted?: boolean; deactivated?: boolean }>(
      `/api/admin/boutique/promos/${promo.id}`,
      { method: 'DELETE', successMessage: used > 0 ? `« ${promo.code} » désactivé` : `« ${promo.code} » supprimé` },
    )
    setBusyId(null)
    if (!res) return
    setPromos((prev) => res.deleted
      ? prev.filter((p) => p.id !== promo.id)
      : prev.map((p) => p.id === promo.id ? { ...p, active: false } : p))
  }

  function upsertLocal(promo: PromoCode) {
    setPromos((prev) => prev.some((p) => p.id === promo.id)
      ? prev.map((p) => p.id === promo.id ? promo : p)
      : [promo, ...prev])
    setEditing(null)
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-12">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">3BeeStudio · Admin</p>
            <h1 className="mt-1.5 text-xl font-extrabold text-ink-0 sm:text-2xl" style={{ letterSpacing: '-0.02em' }}>
              Codes promo
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/admin/boutique"
              className="cursor-pointer whitespace-nowrap rounded-pill border border-[var(--line)] px-3 py-2 text-xs font-semibold text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-ink-0"
            >
              ← Produits
            </Link>
            <button
              onClick={() => setEditing(editing === 'new' ? null : 'new')}
              className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-pill bg-amber px-3 py-2 text-xs font-bold text-bg-0 transition-opacity hover:opacity-90 sm:px-4"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M8 2v12M2 8h12" /></svg>
              Nouveau code
            </button>
          </div>
        </div>

        <AdminFeedback error={error} success={success} onDismiss={clear} />

        {/* Vue d'ensemble */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Codes utilisables" value={String(stats.live)} accent="var(--amber)" />
          <StatCard label="Utilisations" value={String(stats.count)} accent="#38bdf8" />
          <StatCard label="Remises accordées" value={formatPrice(stats.amount)} accent="#34d399" />
        </div>

        {/* Création */}
        {editing === 'new' && (
          <PromoForm
            onCancel={() => setEditing(null)}
            onSaved={upsertLocal}
          />
        )}

        {/* Liste */}
        <div className="space-y-2">
          {promos.length === 0 && editing !== 'new' && (
            <div className="rounded-xl border border-dashed border-[var(--line)] py-12 text-center">
              <p className="text-sm text-ink-3">Aucun code promo pour l’instant.</p>
              <button onClick={() => setEditing('new')} className="mt-3 cursor-pointer text-sm text-amber hover:underline">
                Créer le premier code →
              </button>
            </div>
          )}

          {promos.map((promo) => editing === promo.id ? (
            <PromoForm
              key={promo.id}
              promo={promo}
              onCancel={() => setEditing(null)}
              onSaved={upsertLocal}
            />
          ) : (
            <PromoRow
              key={promo.id}
              promo={promo}
              usage={usage[promo.id]}
              busy={busyId === promo.id}
              onEdit={() => setEditing(promo.id)}
              onToggle={() => toggleActive(promo)}
              onDelete={() => remove(promo)}
            />
          ))}
        </div>

        {/* Règle de cumul — la question revient à chaque opération commerciale */}
        <div className="rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3 text-[12px] leading-relaxed text-ink-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-2">Cumul avec la remise newsletter</p>
          <p>
            Un code en <span className="text-ink-1">pourcentage</span> ou en <span className="text-ink-1">montant</span> remplace
            la remise newsletter −10 % au lieu de s’y ajouter — le client garde alors sa remise newsletter pour une prochaine commande.
            Un code <span className="text-ink-1">livraison gratuite</span> se cumule, lui : il porte sur le port, pas sur le panier.
          </p>
        </div>

      </div>
      {modal}
    </main>
  )
}

// ── Ligne ────────────────────────────────────────────────────────────────────

function PromoRow({
  promo,
  usage,
  busy,
  onEdit,
  onToggle,
  onDelete,
}: {
  promo: PromoCode
  usage?: PromoUsage
  busy: boolean
  onEdit: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  const now     = new Date()
  const expired = !!promo.ends_at && now > new Date(promo.ends_at)
  const pending = !!promo.starts_at && now < new Date(promo.starts_at)
  const spent   = promo.max_uses !== null && promo.uses >= promo.max_uses

  const conditions = [
    promo.min_subtotal > 0 ? `min. ${formatPrice(promo.min_subtotal)}` : null,
    SCOPE_LABEL[promo.applies_to] || null,
    promo.once_per_email ? 'une fois par client' : null,
    promo.starts_at ? `dès le ${dateFormat.format(new Date(promo.starts_at))}` : null,
    promo.ends_at ? `jusqu’au ${dateFormat.format(new Date(promo.ends_at))}` : null,
  ].filter(Boolean)

  return (
    <div className={[
      'rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3 transition-colors hover:border-[var(--line-2)]',
      !promo.active || expired || spent ? 'opacity-60' : '',
    ].join(' ')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[15px] font-bold tracking-wider text-ink-0">{promo.code}</span>
            <span className="rounded-pill border border-[var(--line-amber)] bg-amber/10 px-2 py-0.5 font-mono text-[11px] font-bold text-amber">
              {promoLabel(promo)}
            </span>
            {!promo.active && <Badge tone="zinc">Inactif</Badge>}
            {promo.active && expired && <Badge tone="red">Expiré</Badge>}
            {promo.active && !expired && spent && <Badge tone="red">Épuisé</Badge>}
            {promo.active && !expired && !spent && pending && <Badge tone="amber">Programmé</Badge>}
            {promo.active && !expired && !spent && !pending && <Badge tone="emerald">Actif</Badge>}
          </div>
          <p className="mt-1 truncate text-[12px] text-ink-3">
            {conditions.length > 0 ? conditions.join(' · ') : 'Aucune condition'}
            {promo.note ? ` — ${promo.note}` : ''}
          </p>
        </div>

        {/* Compteur d'usage */}
        <div className="shrink-0 text-right">
          <p className="font-mono text-[13px] font-bold tabular-nums text-ink-1">
            {promo.uses}{promo.max_uses !== null ? ` / ${promo.max_uses}` : ''}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-ink-3">
            {usage?.amount ? formatPrice(usage.amount) : 'utilisations'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Tooltip content={promo.active ? 'Désactiver' : 'Activer'}>
            <button
              onClick={onToggle}
              disabled={busy}
              aria-label={promo.active ? `Désactiver ${promo.code}` : `Activer ${promo.code}`}
              className="cursor-pointer rounded-lg p-2 text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink-1 disabled:opacity-40"
            >
              {promo.active ? (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 8h12M8 2l-3 6 3 6" /></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3 8h10M8 4l4 4-4 4" /></svg>
              )}
            </button>
          </Tooltip>
          <Tooltip content="Modifier">
            <button
              onClick={onEdit}
              disabled={busy}
              aria-label={`Modifier ${promo.code}`}
              className="cursor-pointer rounded-lg p-2 text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink-1 disabled:opacity-40"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5a1.5 1.5 0 012 2L5 13H2v-3L11.5 2.5z" /></svg>
            </button>
          </Tooltip>
          <Tooltip content="Supprimer" side="left">
            <button
              onClick={onDelete}
              disabled={busy}
              aria-label={`Supprimer ${promo.code}`}
              className="cursor-pointer rounded-lg p-2 text-ink-3 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" /></svg>
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

function Badge({ tone, children }: { tone: 'emerald' | 'red' | 'amber' | 'zinc'; children: React.ReactNode }) {
  const tones = {
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    red:     'border-red-500/20 bg-red-500/10 text-red-400',
    amber:   'border-[var(--line-amber)] bg-amber/10 text-amber',
    zinc:    'border-zinc-500/20 bg-zinc-500/10 text-zinc-400',
  }
  return <span className={`rounded-pill border px-2 py-0.5 text-[10px] font-medium ${tones[tone]}`}>{children}</span>
}

// ── Formulaire ───────────────────────────────────────────────────────────────

function PromoForm({
  promo,
  onCancel,
  onSaved,
}: {
  promo?: PromoCode
  onCancel: () => void
  onSaved: (promo: PromoCode) => void
}) {
  const { mutate, error, clear } = useAdminMutation()
  const editing = promo !== undefined

  const [code, setCode]                   = useState(promo?.code ?? '')
  const [type, setType]                   = useState<PromoType>(promo?.type ?? 'percent')
  // Un montant se saisit en euros, pas en centimes : la conversion est faite ici.
  const [value, setValue]                 = useState(() => {
    if (!promo) return '10'
    return promo.type === 'amount' ? (promo.value / 100).toFixed(2) : String(promo.value)
  })
  const [minSubtotal, setMinSubtotal]     = useState(promo ? (promo.min_subtotal / 100).toFixed(2) : '')
  const [appliesTo, setAppliesTo]         = useState<PromoScope>(promo?.applies_to ?? 'all')
  const [maxUses, setMaxUses]             = useState(promo?.max_uses !== null && promo?.max_uses !== undefined ? String(promo.max_uses) : '')
  const [oncePerEmail, setOncePerEmail]   = useState(promo?.once_per_email ?? false)
  const [startsAt, setStartsAt]           = useState(toDateInput(promo?.starts_at ?? null))
  const [endsAt, setEndsAt]               = useState(toDateInput(promo?.ends_at ?? null))
  const [active, setActive]               = useState(promo?.active ?? true)
  const [note, setNote]                   = useState(promo?.note ?? '')
  const [saving, setSaving]               = useState(false)

  const isShipping = type === 'free_shipping'

  async function save() {
    clear()
    const numeric = Number(value.replace(',', '.'))
    const body = {
      code:           normalizeCode(code),
      type,
      value:          isShipping ? 0 : (type === 'amount' ? Math.round(numeric * 100) : Math.round(numeric)),
      active,
      starts_at:      fromDateInput(startsAt),
      ends_at:        fromDateInput(endsAt, true),
      max_uses:       maxUses.trim() ? Number(maxUses) : null,
      once_per_email: oncePerEmail,
      min_subtotal:   minSubtotal.trim() ? Math.round(Number(minSubtotal.replace(',', '.')) * 100) : 0,
      // La livraison gratuite porte sur le colis : la restreindre aux fichiers
      // n'aurait aucun sens, le champ est masqué et forcé.
      applies_to:     isShipping ? 'all' : appliesTo,
      note:           note.trim() || null,
    }

    setSaving(true)
    const res = await mutate<{ promo: PromoCode }>(
      editing ? `/api/admin/boutique/promos/${promo.id}` : '/api/admin/boutique/promos',
      {
        method: editing ? 'PATCH' : 'POST',
        body,
        successMessage: editing ? `« ${body.code} » enregistré` : `« ${body.code} » créé`,
      },
    )
    setSaving(false)
    if (res?.promo) onSaved(res.promo)
  }

  const inputClass = 'w-full rounded-xl border border-[var(--line)] bg-bg-0 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-3 transition-colors focus:border-amber focus:outline-none'
  const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-3'

  return (
    <div className="rounded-xl border border-[var(--line-amber)] bg-bg-1 p-4">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-amber">
        {editing ? `Modifier ${promo.code}` : 'Nouveau code promo'}
      </p>

      {error && (
        <p className="mb-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[13px] text-red-400">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Code</label>
          <input
            className={`${inputClass} font-mono tracking-wider`}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="BIENVENUE10"
            autoComplete="off"
            maxLength={40}
          />
        </div>

        <div>
          <label className={labelClass}>Type de remise</label>
          <Select value={type} onChange={(v) => setType(v as PromoType)} options={TYPE_OPTIONS} />
        </div>

        {!isShipping && (
          <div>
            <label className={labelClass}>{type === 'percent' ? 'Pourcentage' : 'Montant offert'}</label>
            <div className="relative">
              <input
                className={inputClass}
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                inputMode="decimal"
                placeholder={type === 'percent' ? '10' : '5,00'}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-3">
                {type === 'percent' ? '%' : '€'}
              </span>
            </div>
          </div>
        )}

        {!isShipping && (
          <div>
            <label className={labelClass}>S’applique à</label>
            <Select value={appliesTo} onChange={(v) => setAppliesTo(v as PromoScope)} options={SCOPE_OPTIONS} />
          </div>
        )}

        <div>
          <label className={labelClass}>Minimum de commande</label>
          <div className="relative">
            <input
              className={inputClass}
              value={minSubtotal}
              onChange={(e) => setMinSubtotal(e.target.value.replace(/[^0-9.,]/g, ''))}
              inputMode="decimal"
              placeholder="aucun"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-sm text-ink-3">€</span>
          </div>
        </div>

        <div>
          <label className={labelClass}>Nombre d’utilisations</label>
          <input
            className={inputClass}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            placeholder="illimité"
          />
        </div>

        <div>
          <label className={labelClass}>Début (optionnel)</label>
          <input type="date" className={`${inputClass} cursor-pointer`} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>

        <div>
          <label className={labelClass}>Fin (optionnel)</label>
          <input type="date" className={`${inputClass} cursor-pointer`} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Note interne (jamais affichée au client)</label>
          <input
            className={inputClass}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Opération Instagram septembre"
            maxLength={300}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Toggle checked={oncePerEmail} onChange={setOncePerEmail} label="Une seule fois par client" />
        <Toggle checked={active} onChange={setActive} label="Actif" />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="cursor-pointer rounded-pill border border-[var(--line)] px-4 py-2 text-xs font-semibold text-ink-2 transition-colors hover:text-ink-0"
        >
          Annuler
        </button>
        <button
          onClick={save}
          disabled={saving || code.trim().length < 2}
          className="cursor-pointer rounded-pill bg-amber px-4 py-2 text-xs font-bold text-bg-0 transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {saving ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer le code'}
        </button>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex cursor-pointer items-center gap-2.5"
    >
      <span className={[
        'relative flex h-5 w-9 shrink-0 items-center rounded-full border transition-all duration-200',
        checked ? 'border-amber bg-amber' : 'border-[var(--line)] bg-bg-3',
      ].join(' ')}>
        <span className={[
          'absolute h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-1',
        ].join(' ')} />
      </span>
      <span className="text-[13px] text-ink-1">{label}</span>
    </button>
  )
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-bg-1 p-4">
      <p className="truncate font-mono text-lg font-bold leading-tight" style={{ color: accent }}>{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-ink-3">{label}</p>
    </div>
  )
}
