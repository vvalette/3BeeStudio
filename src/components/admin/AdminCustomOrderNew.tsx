'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Route } from 'next'
import Select from '@/components/ui/Select'
import {
  PROJECT_TYPES,
  BUDGET_RANGES,
  DEADLINES,
  type CustomOrder,
} from '@/types/custom-order'
import useUnsavedWarning from './useUnsavedWarning'

/**
 * Saisie manuelle d'une demande sur-mesure (DM Instagram, téléphone, salon…).
 * Seuls le projet, le nom et l'email sont exigés : le reste se complète au fil
 * de l'échange depuis la fiche de la demande.
 */

const inputClass = 'w-full rounded-xl border border-[var(--line-2)] bg-bg-2 px-3.5 py-2.5 text-sm text-ink-0 placeholder:text-ink-3 transition-colors focus:border-amber/50 focus:outline-none'
const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-3'

const UNSET = { value: '', label: 'Non précisé' }

// Origine de la demande. Pas de colonne dédiée en base : l'info est écrite en
// tête des notes internes, où elle reste visible sur la fiche.
const SOURCES = ['Instagram', 'TikTok', 'Email', 'Téléphone', 'Bouche-à-oreille', 'Salon / marché', 'Autre']

const EMPTY = {
  project_type: '',
  description: '',
  budget_range: '',
  deadline: '',
  name: '',
  company: '',
  email: '',
  phone: '',
  shipping_name: '',
  shipping_address: '',
  shipping_postal_code: '',
  shipping_city: '',
  source: '',
  admin_notes: '',
}

type FormState = typeof EMPTY

export default function AdminCustomOrderNew() {
  const router = useRouter()
  const [form, setForm]     = useState<FormState>(EMPTY)
  const [notify, setNotify] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  // Demande créée mais accusé de réception en échec : on ne redirige pas pour
  // que l'admin voie qu'il reste à prévenir le client lui-même.
  const [emailFailed, setEmailFailed] = useState<CustomOrder | null>(null)

  const dirty = Object.values(form).some((v) => v !== '')
  useUnsavedWarning(dirty && !saving && !emailFailed)

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const { source, admin_notes, ...rest } = form
    const notes = [source && `Source : ${source}`, admin_notes.trim()].filter(Boolean).join('\n')

    setSaving(true)
    try {
      const res = await fetch('/api/admin/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rest, admin_notes: notes, notify_client: notify }),
      })
      const payload = await res.json().catch(() => null) as
        { order?: CustomOrder; email_failed?: boolean; error?: string } | null

      if (res.status === 401) {
        router.push('/admin')
        return
      }
      if (!res.ok || !payload?.order) {
        setError(payload?.error ?? `Erreur ${res.status} — demande non créée.`)
        setSaving(false)
        return
      }

      if (payload.email_failed) {
        setEmailFailed(payload.order)
        setSaving(false)
        return
      }

      router.push(`/admin/custom/${payload.order.id}` as Route)
      router.refresh()
    } catch {
      setError('Réseau indisponible — la demande n’a pas été créée.')
      setSaving(false)
    }
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-12">
      <div className="mx-auto max-w-2xl space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/admin/sur-mesure"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--line-2)] bg-bg-1 text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-amber"
            aria-label="Retour aux demandes sur-mesure"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 7H3M3 7l3.5-3.5M3 7l3.5 3.5" />
            </svg>
          </Link>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Sur-mesure · Admin</p>
            <h1 className="mt-0.5 text-xl font-extrabold text-ink-0 sm:text-2xl" style={{ letterSpacing: '-0.02em' }}>
              Nouvelle demande
            </h1>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {emailFailed ? (
          <div className="space-y-4 rounded-2xl border border-amber/30 bg-amber/5 p-5">
            <p className="text-sm font-semibold text-ink-0">Demande créée, mais l’email au client n’est pas parti.</p>
            <p className="text-[13px] leading-relaxed text-ink-2">
              La demande #{emailFailed.id.slice(0, 8).toUpperCase()} est bien enregistrée. Préviens
              {' '}{emailFailed.name} toi-même, ou transmets-lui le lien de suivi depuis sa fiche.
            </p>
            <Link
              href={`/admin/custom/${emailFailed.id}` as Route}
              className="inline-flex h-[42px] cursor-pointer items-center gap-2 rounded-pill px-5 text-[13px] font-bold text-bg-0 transition-all hover:brightness-105"
              style={{ background: 'var(--btn-primary-bg)' }}
            >
              Ouvrir la demande
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            <Card title="Projet">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Type de projet *</label>
                  <Select
                    value={form.project_type}
                    onChange={(v) => set('project_type', v)}
                    options={PROJECT_TYPES.map(({ value, label }) => ({ value, label }))}
                    placeholder="Choisir un type"
                  />
                </div>

                <div>
                  <label htmlFor="description" className={labelClass}>Description *</label>
                  <textarea
                    id="description"
                    required
                    rows={5}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Ce que le client demande, dimensions, matière, quantité, contraintes…"
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Budget</label>
                    <Select
                      value={form.budget_range}
                      onChange={(v) => set('budget_range', v)}
                      options={[UNSET, ...BUDGET_RANGES.map((b) => ({ value: b, label: b }))]}
                      placeholder="Non précisé"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Délai</label>
                    <Select
                      value={form.deadline}
                      onChange={(v) => set('deadline', v)}
                      options={[UNSET, ...DEADLINES.map((d) => ({ value: d, label: d }))]}
                      placeholder="Non précisé"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Client">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className={labelClass}>Nom *</label>
                  <input
                    id="name" required autoComplete="off"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Jean Dupont"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="company" className={labelClass}>Société</label>
                  <input
                    id="company" autoComplete="off"
                    value={form.company}
                    onChange={(e) => set('company', e.target.value)}
                    placeholder="Optionnel"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="email" className={labelClass}>Email *</label>
                  <input
                    id="email" type="email" required autoComplete="off"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="vous@exemple.fr"
                    className={inputClass}
                  />
                  <p className="mt-1.5 text-[11px] leading-relaxed text-ink-3">
                    Sert à envoyer le devis et le lien de paiement de l’acompte.
                  </p>
                </div>
                <div>
                  <label htmlFor="phone" className={labelClass}>Téléphone</label>
                  <input
                    id="phone" type="tel" autoComplete="off"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="Optionnel"
                    className={inputClass}
                  />
                </div>
              </div>
            </Card>

            <Card title="Adresse de livraison" right={<span className="text-[10px] uppercase tracking-wider text-ink-3">Optionnel</span>}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="shipping_name" className={labelClass}>Destinataire</label>
                  <input
                    id="shipping_name" autoComplete="off"
                    value={form.shipping_name}
                    onChange={(e) => set('shipping_name', e.target.value)}
                    placeholder="Jean Dupont"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="shipping_address" className={labelClass}>Adresse</label>
                  <input
                    id="shipping_address" autoComplete="off"
                    value={form.shipping_address}
                    onChange={(e) => set('shipping_address', e.target.value)}
                    placeholder="12 rue des Lilas"
                    className={inputClass}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
                  <div>
                    <label htmlFor="shipping_postal_code" className={labelClass}>Code postal</label>
                    <input
                      id="shipping_postal_code" autoComplete="off" inputMode="numeric"
                      value={form.shipping_postal_code}
                      onChange={(e) => set('shipping_postal_code', e.target.value)}
                      placeholder="75001"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="shipping_city" className={labelClass}>Ville</label>
                    <input
                      id="shipping_city" autoComplete="off"
                      value={form.shipping_city}
                      onChange={(e) => set('shipping_city', e.target.value)}
                      placeholder="Paris"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Suivi interne">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Origine de la demande</label>
                  <Select
                    value={form.source}
                    onChange={(v) => set('source', v)}
                    options={[UNSET, ...SOURCES.map((s) => ({ value: s, label: s }))]}
                    placeholder="Non précisé"
                  />
                </div>
                <div>
                  <label htmlFor="admin_notes" className={labelClass}>Notes internes</label>
                  <textarea
                    id="admin_notes"
                    rows={3}
                    value={form.admin_notes}
                    onChange={(e) => set('admin_notes', e.target.value)}
                    placeholder="Contexte de l’échange, contraintes, todo…"
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--line-2)] bg-bg-2 p-3.5">
                  <input
                    type="checkbox"
                    checked={notify}
                    onChange={(e) => setNotify(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-amber"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink-1">Envoyer l’accusé de réception au client</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-3">
                      Même email que le formulaire du site, avec le lien de suivi. Décoché par défaut :
                      l’échange a déjà lieu ailleurs.
                    </span>
                  </span>
                </label>
              </div>
            </Card>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex h-[46px] cursor-pointer items-center gap-2 rounded-pill px-6 text-[13px] font-bold text-bg-0 transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: 'var(--btn-primary-bg)' }}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round" />
                    </svg>
                    Création…
                  </>
                ) : 'Créer la demande'}
              </button>
              <Link
                href="/admin/sur-mesure"
                className="cursor-pointer text-[13px] text-ink-3 transition-colors hover:text-ink-1"
              >
                Annuler
              </Link>
            </div>
          </form>
        )}
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
