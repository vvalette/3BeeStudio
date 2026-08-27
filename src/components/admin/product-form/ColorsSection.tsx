'use client'

import type { ProductColor } from '@/types/shop-product'
import { generateSlug } from '@/types/shop-product'
import { labelClass } from './state'

// Coloris proposés au client sur la fiche produit.
//
// Une pièce imprimée à la demande sort dans la couleur de la bobine chargée :
// on garde une seule fiche (un seul stock, une seule URL, une seule audience)
// et on demande le coloris à l'achat.

/** Bobines couramment en stock — un clic pour éviter de ressaisir le hex. */
const PRESETS: ProductColor[] = [
  { key: 'blanc',  label: 'Blanc',  label_en: 'White',  hex: '#F2F1EC' },
  { key: 'noir',   label: 'Noir',   label_en: 'Black',  hex: '#1A1A1C' },
  { key: 'rose',   label: 'Rose',   label_en: 'Pink',   hex: '#EFA3BD' },
  { key: 'beige',  label: 'Beige',  label_en: 'Beige',  hex: '#E3D0AF' },
  { key: 'gris',   label: 'Gris',   label_en: 'Grey',   hex: '#8A8A90' },
  { key: 'rouge',  label: 'Rouge',  label_en: 'Red',    hex: '#C0392B' },
  { key: 'bleu',   label: 'Bleu',   label_en: 'Blue',   hex: '#2C5FA8' },
  { key: 'vert',   label: 'Vert',   label_en: 'Green',  hex: '#3D8A5A' },
  { key: 'jaune',  label: 'Jaune',  label_en: 'Yellow', hex: '#E8B923' },
  { key: 'orange', label: 'Orange', label_en: 'Orange', hex: '#E1732B' },
]

const smallInput =
  'w-full rounded-lg border border-[var(--line)] bg-bg-0 px-3 py-2 text-[13px] text-ink-0 placeholder:text-ink-3 focus:outline-none focus:border-amber transition-colors'

export default function ColorsSection({ colors, onChange }: {
  colors: ProductColor[]
  onChange: (colors: ProductColor[]) => void
}) {
  const used = new Set(colors.map((c) => c.key))
  const available = PRESETS.filter((p) => !used.has(p.key))

  const update = (i: number, patch: Partial<ProductColor>) =>
    onChange(colors.map((c, j) => (j === i ? { ...c, ...patch } : c)))

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <label className={labelClass}>Coloris</label>
          <p className="-mt-1 text-[11px] text-ink-3">
            Le client choisit sa couleur sur la fiche produit. Aucun coloris = pas de sélecteur.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...colors, { key: `couleur_${colors.length + 1}`, label: '', hex: '#F2F1EC' }])}
          className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--line-amber)] bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/20"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
          Couleur libre
        </button>
      </div>

      {/* Ajout rapide : les bobines du studio */}
      {available.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {available.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => onChange([...colors, { ...preset }])}
              className="flex cursor-pointer items-center gap-1.5 rounded-pill border border-[var(--line)] px-2.5 py-1 text-[11px] text-ink-2 transition-colors hover:border-[var(--line-amber)] hover:text-ink-0"
            >
              <span
                className="h-3 w-3 rounded-full border border-[var(--line-2)]"
                style={{ backgroundColor: preset.hex }}
              />
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {colors.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] px-4 py-5 text-center text-[12px] text-ink-3">
          Aucun coloris — ce produit se vend dans une seule couleur
        </div>
      ) : (
        <div className="space-y-2">
          {colors.map((color, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-bg-1 p-2.5">
              {/* Pastille + sélecteur natif : le hex n'est qu'un aperçu client */}
              <label
                className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-[var(--line-2)]"
                style={{ backgroundColor: color.hex }}
                title="Modifier la teinte"
              >
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => update(i, { hex: e.target.value })}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              <div className="grid flex-1 grid-cols-2 gap-2">
                <input
                  className={smallInput}
                  value={color.label}
                  placeholder="Blanc"
                  required
                  onChange={(e) => update(i, {
                    label: e.target.value,
                    // La clé identifie le coloris de bout en bout (panier, commande,
                    // facture) : dérivée du libellé, jamais saisie à la main.
                    key: generateSlug(e.target.value) || color.key,
                  })}
                />
                <input
                  className={smallInput}
                  value={color.label_en ?? ''}
                  placeholder="White"
                  onChange={(e) => update(i, { label_en: e.target.value || undefined })}
                />
              </div>
              <span className="hidden w-24 shrink-0 font-mono text-[10px] text-ink-3 sm:block">{color.key || '—'}</span>
              <button
                type="button"
                onClick={() => onChange(colors.filter((_, j) => j !== i))}
                aria-label="Retirer ce coloris"
                className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg p-1.5 text-ink-3 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 5h10M5 5V3.5h6V5M6 8v5M10 8v5M4 5l1 8h6l1-8" />
                </svg>
              </button>
            </div>
          ))}
          <p className="text-[11px] text-ink-3">
            Le premier coloris est présélectionné sur la fiche. Une seule photo pour l&apos;instant, quel que soit le choix.
          </p>
        </div>
      )}
    </div>
  )
}
