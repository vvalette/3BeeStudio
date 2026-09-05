'use client'

import { useState } from 'react'
import Select, { type SelectOption } from '@/components/ui/Select'
import type { CustomOrder } from '@/types/custom-order'
import { useAdminMutation } from './useAdminMutation'
import AdminFeedback from './AdminFeedback'
import useUnsavedWarning from './useUnsavedWarning'

/**
 * Édition en place d'un bloc de la fiche sur-mesure : client, projet, adresse.
 *
 * Une demande n'est pas figée à sa création. L'adresse est dictée au téléphone
 * une fois le devis accepté, l'email est mal tapé, le projet se précise. Sans
 * ces champs, la seule issue était de recréer la demande, en perdant devis,
 * numéro et encaissements.
 *
 * Un seul bloc s'édite à la fois sur la fiche : le formulaire n'a donc pas à
 * préfixer ses `id`, et le garde-fou « saisie non enregistrée » ne surveille
 * qu'une chose.
 */

/** Colonnes texte de la demande ouvertes à la correction. */
export type EditableKey =
  | 'name' | 'company' | 'email' | 'phone'
  | 'project_type' | 'description' | 'budget_range' | 'deadline'
  | 'shipping_name' | 'shipping_address' | 'shipping_postal_code' | 'shipping_city'

export interface EditableField {
  key: EditableKey
  label: string
  /** Ignoré quand `options` est fourni : la liste rend un Select. */
  type?: 'text' | 'email' | 'tel' | 'textarea'
  options?: SelectOption[]
  placeholder?: string
  /** Colonne NOT NULL : le champ ne peut pas être laissé vide. */
  required?: boolean
  /** Occupe les deux colonnes de la grille. */
  full?: boolean
}

const inputClass = 'w-full rounded-lg border border-[var(--line-2)] bg-bg-2 px-3 py-2 text-sm text-ink-0 placeholder:text-ink-3 transition-colors focus:border-amber/50 focus:outline-none'
const labelClass = 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-3'

/** Valeur affichable d'une colonne texte, `null` compris. */
function current(order: CustomOrder, key: EditableKey): string {
  return (order[key] as string | null) ?? ''
}

export default function AdminCustomFields({
  order,
  fields,
  note,
  columns = 2,
  onSaved,
  onCancel,
}: {
  order: CustomOrder
  fields: EditableField[]
  /** Précision affichée sous la grille (conséquence d'un changement, par ex.). */
  note?: string
  /** 1 dans la colonne latérale, trop étroite pour deux champs côte à côte. */
  columns?: 1 | 2
  onSaved: (order: CustomOrder) => void
  onCancel: () => void
}) {
  const { mutate, loading, error, setError, clear } = useAdminMutation()
  const [draft, setDraft] = useState<Record<string, string>>(
    () => Object.fromEntries(fields.map((f) => [f.key, current(order, f.key)])),
  )

  const dirty = fields.some((f) => draft[f.key].trim() !== current(order, f.key))
  useUnsavedWarning(dirty)

  function set(key: EditableKey, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!dirty) {
      onCancel()
      return
    }

    const missing = fields.find((f) => f.required && !draft[f.key].trim())
    if (missing) {
      setError(`${missing.label} ne peut pas rester vide.`)
      return
    }

    // Seuls les champs touchés partent : un PATCH complet réécrirait des
    // colonnes qu'un autre onglet vient peut-être de changer.
    const updates: Partial<Record<EditableKey, string>> = {}
    for (const f of fields) {
      const value = draft[f.key].trim()
      if (value !== current(order, f.key)) updates[f.key] = value
    }

    const updated = await mutate<CustomOrder>(`/api/admin/custom/${order.id}`, {
      body: updates,
      successMessage: 'Fiche mise à jour',
    })
    if (updated) {
      onSaved(updated)
      onCancel()
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className={['grid gap-4', columns === 2 && 'sm:grid-cols-2'].filter(Boolean).join(' ')}>
        {fields.map((field) => (
          <div key={field.key} className={field.full && columns === 2 ? 'sm:col-span-2' : undefined}>
            <label htmlFor={field.key} className={labelClass}>
              {field.label}{field.required && ' *'}
            </label>

            {field.options ? (
              <Select
                value={draft[field.key]}
                onChange={(v) => set(field.key, v)}
                options={field.options}
                placeholder={field.placeholder ?? 'Non précisé'}
              />
            ) : field.type === 'textarea' ? (
              <textarea
                id={field.key}
                rows={5}
                required={field.required}
                value={draft[field.key]}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={`${inputClass} resize-none leading-relaxed`}
              />
            ) : (
              <input
                id={field.key}
                type={field.type ?? 'text'}
                required={field.required}
                autoComplete="off"
                inputMode={field.key === 'shipping_postal_code' ? 'numeric' : undefined}
                value={draft[field.key]}
                onChange={(e) => set(field.key, e.target.value)}
                placeholder={field.placeholder}
                className={inputClass}
              />
            )}
          </div>
        ))}
      </div>

      {note && <p className="text-[11px] leading-relaxed text-ink-3">{note}</p>}

      <AdminFeedback error={error} onDismiss={clear} />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || !dirty}
          className="flex h-[38px] cursor-pointer items-center rounded-pill px-5 text-[13px] font-bold text-bg-0 transition-all hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: 'var(--btn-primary-bg)' }}
        >
          {loading ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer text-[13px] text-ink-3 transition-colors hover:text-ink-1"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
