'use client'

import { useState } from 'react'
import type { ShopCategoryRow } from '@/types/shop-category'
import Select from '@/components/ui/Select'
import { inputClass, labelClass } from './state'

// Catégorie (avec création inline) + toggle "mis en avant".

export default function CategoryFeaturedSection({ initialCategories, category, featured, onCategory, onFeatured }: {
  initialCategories: ShopCategoryRow[]
  category: string
  featured: boolean
  onCategory: (key: string) => void
  onFeatured: (v: boolean) => void
}) {
  const [categories, setCategories]       = useState<ShopCategoryRow[]>(initialCategories)
  const [showNewCat, setShowNewCat]       = useState(false)
  const [newCatLabel, setNewCatLabel]     = useState('')
  const [newCatLabelEn, setNewCatLabelEn] = useState('')
  const [newCatSaving, setNewCatSaving]   = useState(false)
  const [newCatError, setNewCatError]     = useState<string | null>(null)

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatLabel.trim()) return
    setNewCatError(null)
    setNewCatSaving(true)
    const res = await fetch('/api/admin/boutique/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newCatLabel.trim(), label_en: newCatLabelEn.trim() || undefined }),
    })
    const data = await res.json()
    if (!res.ok) {
      setNewCatError(data.error ?? 'Erreur lors de la création')
      setNewCatSaving(false)
      return
    }
    setCategories((prev) => [...prev, data])
    onCategory(data.key)
    setShowNewCat(false)
    setNewCatLabel('')
    setNewCatLabelEn('')
    setNewCatSaving(false)
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className={labelClass}>Catégorie</label>
        <Select
          value={category}
          onChange={onCategory}
          placeholder="— Aucune catégorie —"
          options={[
            { value: '', label: '— Aucune catégorie —' },
            ...categories.map((cat) => ({ value: cat.key, label: cat.label })),
          ]}
        />

        {/* Création inline */}
        {!showNewCat ? (
          <button
            type="button"
            onClick={() => setShowNewCat(true)}
            className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-ink-3 hover:text-amber transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
            Nouvelle catégorie
          </button>
        ) : (
          <form onSubmit={handleCreateCategory} className="rounded-xl border border-[var(--line-amber)] bg-amber/5 p-3 space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber">Nouvelle catégorie</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-1">Libellé FR *</label>
                <input
                  className={inputClass}
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  placeholder="Ex : Jeux & Loisirs"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-3 mb-1">Libellé EN</label>
                <input
                  className={inputClass}
                  value={newCatLabelEn}
                  onChange={(e) => setNewCatLabelEn(e.target.value)}
                  placeholder="E.g. Games & Leisure"
                />
              </div>
            </div>
            {newCatError && <p className="text-[11px] text-red-400">{newCatError}</p>}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={newCatSaving || !newCatLabel.trim()}
                className="cursor-pointer rounded-lg bg-amber px-3 py-1.5 text-[12px] font-bold text-bg-0 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {newCatSaving ? 'Création…' : 'Créer'}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewCat(false); setNewCatLabel(''); setNewCatLabelEn(''); setNewCatError(null) }}
                className="cursor-pointer rounded-lg border border-[var(--line)] px-3 py-1.5 text-[12px] text-ink-3 hover:text-ink-1 transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="flex flex-col justify-end pb-0.5">
        <label className={labelClass}>Mise en avant</label>
        <button
          type="button"
          onClick={() => onFeatured(!featured)}
          className={['flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all', featured ? 'border-amber/40 bg-amber/10 text-amber' : 'border-[var(--line)] bg-bg-1 text-ink-3'].join(' ')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill={featured ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          {featured ? 'Populaire' : 'Non mis en avant'}
        </button>
      </div>
    </div>
  )
}
