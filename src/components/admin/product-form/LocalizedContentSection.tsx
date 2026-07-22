'use client'

import { useState } from 'react'
import { generateSlug } from '@/types/shop-product'
import { inputClass, labelClass, type ProductFormState } from './state'

// Onglets FR/EN : nom, slug, sous-titre, description.

export default function LocalizedContentSection({ form, set }: {
  form: ProductFormState
  set: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void
}) {
  const [lang, setLang] = useState<'fr' | 'en'>('fr')

  return (
    <>
      {/* Sélecteur de langue */}
      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
        {([
          { key: 'fr' as const, flag: '🇫🇷', label: 'Français', badge: false },
          { key: 'en' as const, flag: '🇬🇧', label: 'English',  badge: !form.nameEn },
        ]).map(({ key, flag, label, badge }) => (
          <button
            key={key}
            type="button"
            onClick={() => setLang(key)}
            className={['flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all', lang === key ? 'bg-bg-0 text-ink-0' : 'text-ink-3 hover:text-ink-1'].join(' ')}
          >
            <span>{flag}</span>
            {label}
            {badge && (
              <span className="rounded-pill bg-amber/20 px-1.5 py-0.5 font-mono text-[10px] text-amber">vide</span>
            )}
          </button>
        ))}
      </div>

      {lang === 'fr' ? (
        <>
          {/* Nom FR */}
          <div>
            <label className={labelClass}>Nom du produit *</label>
            <input className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex : Porte-clé décoratif hexagonal" required minLength={2} />
          </div>

          {/* Slug */}
          <div>
            <label className={labelClass}>Slug URL</label>
            <div className="flex items-center rounded-xl border border-[var(--line)] bg-bg-1 focus-within:border-amber transition-colors overflow-hidden">
              <span className="shrink-0 select-none border-r border-[var(--line)] bg-bg-2 px-3 py-2.5 text-sm text-ink-3">/boutique/</span>
              <input
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none"
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder={form.name ? generateSlug(form.name) : 'auto-généré'}
              />
            </div>
            {!form.slug && form.name && <p className="mt-1 text-[11px] text-ink-3">Sera : /boutique/{generateSlug(form.name)}</p>}
          </div>

          {/* Sous-titre FR */}
          <div>
            <label className={labelClass}>Sous-titre <span className="text-ink-3 normal-case font-normal">(affiché sous le nom dans les cartes)</span></label>
            <input className={inputClass} value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} placeholder="Ex : PLA noir mat · Impression 3D" maxLength={80} />
          </div>

          {/* Description FR */}
          <div>
            <label className={labelClass}>Description <span className="text-ink-3 normal-case font-normal">— markdown supporté</span></label>
            <textarea className={inputClass + ' resize-none font-mono text-[13px]'} rows={6} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={"Description du produit…\n\n**Matériaux** : PLA\n- Résistant\n- Léger"} />
          </div>
        </>
      ) : (
        <>
          {/* Nom EN */}
          <div>
            <label className={labelClass}>Product name <span className="text-ink-3 normal-case font-normal">(English)</span></label>
            <input className={inputClass} value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} placeholder="E.g. Hexagonal decorative keychain" maxLength={120} />
          </div>

          {/* Sous-titre EN */}
          <div>
            <label className={labelClass}>Subtitle <span className="text-ink-3 normal-case font-normal">(English)</span></label>
            <input className={inputClass} value={form.subtitleEn} onChange={(e) => set('subtitleEn', e.target.value)} placeholder="E.g. Matte black PLA · 3D printed" maxLength={80} />
          </div>

          {/* Description EN */}
          <div>
            <label className={labelClass}>Description <span className="text-ink-3 normal-case font-normal">— markdown supported</span></label>
            <textarea className={inputClass + ' resize-none font-mono text-[13px]'} rows={6} value={form.descriptionEn} onChange={(e) => set('descriptionEn', e.target.value)} placeholder={"Product description…\n\n**Material**: PLA\n- Heat resistant\n- Lightweight"} />
          </div>

          {!form.nameEn && (
            <div className="rounded-xl border border-amber/20 bg-amber/5 px-4 py-3 text-[12px] text-amber">
              Aucun contenu anglais renseigné — la version française sera utilisée en fallback pour les visiteurs /en/.
            </div>
          )}
        </>
      )}
    </>
  )
}
