'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
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
 *
 * Un devis PDF déjà fabriqué peut être joint dès la saisie. Il ne part nulle
 * part tant que la demande n'existe pas : le fichier attend côté navigateur,
 * puis est téléversé sur la demande tout juste créée. Le total, l'acompte et
 * l'envoi au client se règlent ensuite sur la fiche.
 */

const inputClass = 'w-full rounded-xl border border-[var(--line-2)] bg-bg-2 px-3.5 py-2.5 text-sm text-ink-0 placeholder:text-ink-3 transition-colors focus:border-amber/50 focus:outline-none'
const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-3'

const UNSET = { value: '', label: 'Non précisé' }

/** Même plafond que la route de téléversement, pour refuser avant l'envoi. */
const MAX_PDF_SIZE = 10 * 1024 * 1024 // 10 Mo

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`
}

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

/** Deux façons d'ouvrir une demande : tout saisir, ou partir d'un devis déjà fait. */
type CreateMode = 'form' | 'import'

const CREATE_MODES: { value: CreateMode; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    value: 'form',
    label: 'Saisir la demande',
    hint: 'Le devis se compose ensuite dans l’app, ligne par ligne.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 13l.5-2.5 7-7 2 2-7 7L3 13zM10 3.5l2 2" />
      </svg>
    ),
  },
  {
    value: 'import',
    label: 'Importer un devis PDF',
    hint: 'Le devis existe déjà : il part tel quel au client depuis sa fiche.',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 10.5V2M8 2L5 5M8 2l3 3M2.5 11.5v1.5a1 1 0 001 1h9a1 1 0 001-1v-1.5" />
      </svg>
    ),
  },
]

interface CreatedWithWarnings {
  order: CustomOrder
  /** L'accusé de réception n'est pas parti. */
  emailFailed: boolean
  /** Le devis PDF n'a pas pu être rattaché — cause à afficher. */
  uploadError: string | null
}

export default function AdminCustomOrderNew() {
  const router = useRouter()
  const [form, setForm]     = useState<FormState>(EMPTY)
  const [notify, setNotify] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  // Demande créée mais quelque chose n'a pas suivi (accusé de réception,
  // devis joint) : on ne redirige pas, pour que l'admin voie ce qu'il reste à
  // faire lui-même.
  const [created, setCreated] = useState<CreatedWithWarnings | null>(null)
  // Devis importé : gardé en mémoire le temps de la saisie, il n'a pas encore
  // de demande à laquelle se rattacher.
  const [quoteFile, setQuoteFile] = useState<File | null>(null)
  const [mode, setMode] = useState<CreateMode>('form')

  const dirty = Object.values(form).some((v) => v !== '') || !!quoteFile
  useUnsavedWarning(dirty && !saving && !created)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => {
      const file = accepted[0]
      if (!file) return
      if (file.size > MAX_PDF_SIZE) {
        setError('Devis PDF trop lourd (max 10 Mo).')
        return
      }
      setError(null)
      setQuoteFile(file)
    },
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
  })

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

      // La demande existe enfin : le devis mis de côté a maintenant où aller.
      let uploadError: string | null = null
      if (quoteFile) {
        try {
          const body = new FormData()
          body.append('file', quoteFile)
          const upload = await fetch(`/api/admin/custom/${payload.order.id}/quote-file`, { method: 'POST', body })
          if (!upload.ok) {
            const detail = await upload.json().catch(() => null) as { error?: string } | null
            uploadError = detail?.error ?? `Téléversement refusé (${upload.status})`
          }
        } catch {
          uploadError = 'Réseau interrompu pendant l’envoi du devis.'
        }
      }

      // Un raté sur l'email ou sur le devis ne doit pas passer inaperçu dans la
      // redirection : la demande est créée, mais il reste quelque chose à faire.
      if (payload.email_failed || uploadError) {
        setCreated({ order: payload.order, emailFailed: !!payload.email_failed, uploadError })
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

        {created ? (
          <div className="space-y-4 rounded-2xl border border-amber/30 bg-amber/5 p-5">
            <p className="text-sm font-semibold text-ink-0">
              Demande #{created.order.id.slice(0, 8).toUpperCase()} créée, mais il reste à faire.
            </p>
            <ul className="space-y-2 text-[13px] leading-relaxed text-ink-2">
              {created.emailFailed && (
                <li>
                  L’accusé de réception n’est pas parti : préviens {created.order.name} toi-même,
                  ou transmets-lui le lien de suivi depuis sa fiche.
                </li>
              )}
              {created.uploadError && (
                <li>
                  Le devis PDF n’a pas été joint ({created.uploadError}). Reprends-le depuis la fiche,
                  onglet « Importer un PDF ».
                </li>
              )}
            </ul>
            <Link
              href={`/admin/custom/${created.order.id}` as Route}
              className="inline-flex h-[42px] cursor-pointer items-center gap-2 rounded-pill px-5 text-[13px] font-bold text-bg-0 transition-all hover:brightness-105"
              style={{ background: 'var(--btn-primary-bg)' }}
            >
              Ouvrir la demande
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">

            <Card title="Point de départ">
              <div className="grid gap-2 sm:grid-cols-2">
                {CREATE_MODES.map((m) => {
                  const active = mode === m.value
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => {
                        setMode(m.value)
                        // Revenir à la saisie classique lâche le devis mis de
                        // côté : il partirait sinon sans que l'écran le montre.
                        if (m.value === 'form') setQuoteFile(null)
                        // Idem dans l'autre sens : budget et délai disparaissent
                        // de l'écran, ils ne doivent pas partir en douce.
                        else setForm((prev) => ({ ...prev, budget_range: '', deadline: '' }))
                      }}
                      className={[
                        'flex cursor-pointer flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-colors',
                        active ? 'border-[var(--line-amber)] bg-amber/5' : 'border-[var(--line)] hover:border-[var(--line-2)]',
                      ].join(' ')}
                    >
                      <span className={['flex items-center gap-2 text-sm font-semibold', active ? 'text-amber' : 'text-ink-1'].join(' ')}>
                        {m.icon}
                        {m.label}
                      </span>
                      <span className="text-[11px] leading-snug text-ink-3">{m.hint}</span>
                    </button>
                  )
                })}
              </div>
            </Card>

            {mode === 'import' && (
              <Card title="Devis à joindre">
                {quoteFile ? (
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-emerald-400">
                      <path d="M9.5 1.5H4a1 1 0 00-1 1v11a1 1 0 001 1h8a1 1 0 001-1V5l-3.5-3.5z" /><path d="M9.5 1.5V5H13" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-0">{quoteFile.name}</p>
                      <p className="text-[11px] text-ink-3">
                        {formatSize(quoteFile.size)} · rattaché à la demande dès sa création
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuoteFile(null)}
                      aria-label="Retirer le devis"
                      className="shrink-0 cursor-pointer rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
                      <p className="text-sm font-medium">Glisser ou cliquer pour importer le devis</p>
                      <p className="text-[11px]">PDF uniquement — max 10 Mo</p>
                    </div>
                  </div>
                )}
                <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
                  Le fichier attend la création de la demande, puis se range dans son stockage privé.
                  Le total, l’acompte et l’envoi au client se règlent juste après, sur sa fiche.
                </p>
              </Card>
            )}

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

                {/* Fourchette de budget et délai servent à préparer un chiffrage :
                    quand le devis est déjà fait, ils n'ont plus rien à cadrer. */}
                {mode === 'form' && (
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
                )}
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
                ) : mode === 'import' && quoteFile ? 'Créer la demande et joindre le devis' : 'Créer la demande'}
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
