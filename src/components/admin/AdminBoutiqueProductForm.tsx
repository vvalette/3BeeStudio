'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ShopProduct } from '@/types/shop-product'
import type { ShopCategoryRow } from '@/types/shop-category'
import { useConfirm } from '@/components/ui/ConfirmModal'
import { formatPrice } from '@/lib/utils'
import ImageDropzone from './product-form/ImageDropzone'
import StlUpload from './product-form/StlUpload'
import DigitalProductSection from './product-form/DigitalProductSection'
import LocalizedContentSection from './product-form/LocalizedContentSection'
import ModelRotationSection from './product-form/ModelRotationSection'
import ColorsSection from './product-form/ColorsSection'
import CustomFieldsSection from './product-form/CustomFieldsSection'
import CategoryFeaturedSection from './product-form/CategoryFeaturedSection'
import {
  buildInitialState, buildProductPayload, parseEuros,
  inputClass, labelClass,
  type ProductFormState,
} from './product-form/state'

interface Props {
  product?: ShopProduct
  initialCategories?: ShopCategoryRow[]
}

// Formulaire produit admin : l'état vit dans un objet unique (state.ts), chaque
// bloc d'UI dans une section sous ./product-form/. Ce fichier ne garde que
// l'orchestration (soumission, suppression, composition).

export default function AdminBoutiqueProductForm({ product, initialCategories = [] }: Props) {
  const router = useRouter()
  const { confirm, modal } = useConfirm()
  const isEdit = !!product

  const [form, setForm]       = useState<ProductFormState>(() => buildInitialState(product))
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function set<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Un fichier n'a ni stock ni poids : ces champs sont remplacés par une mention
  // explicite plutôt que masqués, pour qu'on voie que c'est voulu.
  const isDigitalProduct = form.productType === 'digital'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const result = buildProductPayload(form)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setSaving(true)
    const url    = isEdit ? `/api/admin/boutique/products/${product!.id}` : '/api/admin/boutique/products'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Une erreur est survenue')
      setSaving(false)
      return
    }

    router.push('/admin/boutique')
    router.refresh()
  }

  async function handleDelete() {
    if (!product) return
    if (!await confirm({ title: 'Supprimer ce produit ?', message: 'Il sera archivé dans Stripe et retiré de la boutique.', confirmLabel: 'Supprimer', variant: 'danger' })) return
    setDeleting(true)
    const res = await fetch(`/api/admin/boutique/products/${product.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur lors de la suppression')
      setDeleting(false)
      return
    }
    router.push('/admin/boutique')
    router.refresh()
  }

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-12">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => router.back()}
            className="flex cursor-pointer items-center gap-1.5 rounded-pill border border-[var(--line)] px-3 py-1.5 text-xs text-ink-2 hover:text-ink-0 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
            Retour
          </button>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Boutique · Admin</p>
            <h1 className="mt-0.5 text-xl font-extrabold text-ink-0 sm:text-2xl" style={{ letterSpacing: '-0.02em' }}>
              {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
            </h1>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Contenu FR/EN : nom, slug, sous-titre, description */}
          <LocalizedContentSection form={form} set={set} />

          {/* Type de produit + fichier vendu (si numérique) */}
          <DigitalProductSection form={form} set={set} />

          {/* Prix + Stock — le stock n'a pas de sens pour un fichier */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prix (€) *</label>
              <div className="relative">
                <input className={inputClass + ' pr-8'} value={form.priceEuros} onChange={(e) => set('priceEuros', e.target.value)} placeholder="12.90" required />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-3">€</span>
              </div>
              {form.priceEuros && !isNaN(parseFloat(form.priceEuros.replace(',', '.'))) && (
                <p className="mt-1 text-[11px] text-ink-3">→ {formatPrice(parseEuros(form.priceEuros))}</p>
              )}
            </div>
            {isDigitalProduct ? (
              <div className="flex flex-col justify-end pb-0.5">
                <label className={labelClass}>Stock</label>
                <p className="rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-2.5 text-sm text-ink-3">
                  Illimité — un fichier ne s&apos;épuise pas
                </p>
              </div>
            ) : (
              <div>
                <label className={labelClass}>Stock (vide = illimité)</label>
                <input className={inputClass} value={form.stock} onChange={(e) => set('stock', e.target.value)} placeholder="∞" type="number" min="0" />
              </div>
            )}
          </div>

          {/* Prix promotionnel */}
          <div>
            <label className={labelClass}>
              Prix promotionnel (€)
              <span className="ml-1.5 normal-case font-normal text-ink-3">— laisser vide pour désactiver la promo</span>
            </label>
            <div className="relative">
              <input
                className={inputClass + ' pr-8'}
                value={form.salePriceEuros}
                onChange={(e) => set('salePriceEuros', e.target.value)}
                placeholder="Vide = pas de promo"
                type="number"
                min="0"
                step="0.01"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-3">€</span>
            </div>
            {form.salePriceEuros && !isNaN(parseFloat(form.salePriceEuros.replace(',', '.'))) && (() => {
              const sp = parseEuros(form.salePriceEuros)
              const bp = parseEuros(form.priceEuros)
              const pct = bp > 0 ? Math.round((1 - sp / bp) * 100) : 0
              return (
                <p className="mt-1 text-[11px]">
                  <span className="text-amber">{formatPrice(sp)}</span>
                  {bp > 0 && sp < bp && <span className="ml-1.5 text-red-400 font-semibold">(-{pct}%)</span>}
                  {bp > 0 && sp >= bp && <span className="ml-1.5 text-red-400">⚠ doit être inférieur au prix de base</span>}
                </p>
              )
            })()}
          </div>

          {/* Images — dropzone */}
          <div>
            <label className={labelClass}>Images produit (max 6)</label>
            <ImageDropzone images={form.images} onChange={(imgs) => set('images', imgs)} />
          </div>

          {/* Fichier STL */}
          <div>
            <label className={labelClass}>Modèle 3D (.stl / .3mf) — optionnel</label>
            <p className="mb-2 text-[11px] text-ink-3">Permet au client de visualiser le produit en 3D. Le format .3mf supporte les couleurs multiples.</p>
            <StlUpload stlUrl={form.stlUrl} onChange={(url) => set('stlUrl', url)} />
          </div>

          {/* Orientation du modèle 3D */}
          {form.stlUrl && (
            <ModelRotationSection
              stlUrl={form.stlUrl}
              rotation={form.modelRotation}
              onChange={(r) => set('modelRotation', r)}
            />
          )}

          {/* Coloris — un fichier n'a pas de couleur, c'est l'acheteur qui imprime */}
          {!isDigitalProduct && (
            <ColorsSection colors={form.colors} onChange={(c) => set('colors', c)} />
          )}

          {/* Champs personnalisés */}
          <CustomFieldsSection fields={form.customFields} onChange={(f) => set('customFields', f)} />

          {/* Catégorie + Mis en avant */}
          <CategoryFeaturedSection
            initialCategories={initialCategories}
            category={form.category}
            featured={form.featured}
            onCategory={(key) => set('category', key)}
            onFeatured={(v) => set('featured', v)}
          />

          {/* Poids + Actif — le poids ne concerne que les colis */}
          <div className="grid grid-cols-2 gap-4">
            {isDigitalProduct ? (
              <div className="flex flex-col justify-end pb-0.5">
                <label className={labelClass}>Poids</label>
                <p className="rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-2.5 text-sm text-ink-3">
                  Sans objet — aucun colis
                </p>
              </div>
            ) : (
              <div>
                <label className={labelClass}>Poids (grammes) *</label>
                <div className="relative">
                  <input className={inputClass + ' pr-8'} value={form.weightGrams} onChange={(e) => set('weightGrams', e.target.value)} type="number" min="1" required placeholder="ex. 7" />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-3">g</span>
                </div>
                <p className="mt-1 text-[11px] text-ink-3">
                  Poids réel de la pièce. Sert à calculer le colis Boxtal : une valeur trop haute fait payer l&apos;expédition bien plus cher.
                </p>
              </div>
            )}
            <div className="flex flex-col justify-end pb-0.5">
              <label className={labelClass}>Visibilité</label>
              <button
                type="button"
                onClick={() => set('active', !form.active)}
                className={['flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all', form.active ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-[var(--line)] bg-bg-1 text-ink-3'].join(' ')}
              >
                <span className={['h-2 w-2 rounded-full', form.active ? 'bg-emerald-400' : 'bg-ink-3'].join(' ')} />
                {form.active ? 'Actif — visible' : 'Inactif — masqué'}
              </button>
            </div>
          </div>

          {/* Stripe info */}
          {isEdit && product?.stripe_product_id && (
            <div className="rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3 text-[12px] text-ink-3 space-y-1 [&_span]:break-all">
              <p className="font-mono">Stripe Product : <span className="text-ink-2">{product.stripe_product_id}</span></p>
              <p className="font-mono">Stripe Price&nbsp;&nbsp;: <span className="text-ink-2">{product.stripe_price_id}</span></p>
              <p className="text-[11px] mt-1">⚠ Modifier le prix crée un nouveau Stripe Price et archive l&apos;ancien.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {isEdit ? (
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="cursor-pointer rounded-pill border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            ) : <span />}
            <button type="submit" disabled={saving}
              className="cursor-pointer rounded-pill bg-amber px-6 py-2.5 text-sm font-bold text-bg-0 hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Créer le produit'}
            </button>
          </div>
        </form>
      </div>
      {modal}
    </main>
  )
}
