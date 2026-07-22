'use client'

import type { ProductCustomField } from '@/types/shop-product'
import { generateSlug } from '@/types/shop-product'
import { inputClass, labelClass } from './state'

// Champs personnalisés demandés au client à la commande (ex : prénom à graver).

export default function CustomFieldsSection({ fields, onChange }: {
  fields: ProductCustomField[]
  onChange: (fields: ProductCustomField[]) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <label className={labelClass}>Champs personnalisés</label>
          <p className="text-[11px] text-ink-3 -mt-1">Demandés au client lors de la commande (ex : prénom, texte à graver)</p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...fields, { key: `champ_${fields.length + 1}`, label: '', required: false }])}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--line-amber)] bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber hover:bg-amber/20 transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
          Ajouter un champ
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] px-4 py-5 text-center text-[12px] text-ink-3">
          Aucun champ — ce produit ne nécessite pas de personnalisation
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, i) => (
            <div key={i} className="rounded-xl border border-[var(--line)] bg-bg-1 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Champ {i + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onChange(fields.map((f, j) => j === i ? { ...f, required: !f.required } : f))}
                    className={[
                      'flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all',
                      field.required
                        ? 'border-amber/40 bg-amber/10 text-amber'
                        : 'border-[var(--line)] text-ink-3 hover:border-[var(--line-2)]',
                    ].join(' ')}
                  >
                    {field.required ? 'Obligatoire' : 'Optionnel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(fields.filter((_, j) => j !== i))}
                    className="flex cursor-pointer items-center justify-center rounded-lg p-1.5 text-ink-3 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 5h10M5 5V3.5h6V5M6 8v5M10 8v5M4 5l1 8h6l1-8" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-1">Libellé FR *</label>
                  <input
                    className={inputClass}
                    value={field.label}
                    placeholder="Ex : Prénom"
                    required
                    onChange={(e) => onChange(fields.map((f, j) => j === i
                      ? { ...f, label: e.target.value, key: generateSlug(e.target.value) || f.key }
                      : f))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-1">Libellé EN</label>
                  <input
                    className={inputClass}
                    value={field.label_en ?? ''}
                    placeholder="E.g. First name"
                    onChange={(e) => onChange(fields.map((f, j) => j === i
                      ? { ...f, label_en: e.target.value || undefined }
                      : f))}
                  />
                </div>
              </div>
              <p className="font-mono text-[10px] text-ink-3">Clé : <span className="text-ink-2">{field.key || '—'}</span></p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
