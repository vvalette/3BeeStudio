'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import type { ShopProduct, ProductCustomField } from '@/types/shop-product'
import { generateSlug } from '@/types/shop-product'
import type { ShopCategoryRow } from '@/types/shop-category'
import Select from '@/components/ui/Select'
import { formatPrice } from '@/lib/utils'
import ImageCropModal from './ImageCropModal'

interface Props {
  product?: ShopProduct
  initialCategories?: ShopCategoryRow[]
}

// ── Upload image ───────────────────────────────────────────────────────────────

function ImageDropzone({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cropQueue, setCropQueue] = useState<{ src: string; file: File }[]>([])

  async function uploadBlob(blob: Blob, originalFile: File): Promise<string | null> {
    const mime = blob.type || 'image/jpeg'
    const ext  = mime.includes('webp') ? 'webp' : mime.includes('png') ? 'png' : 'jpg'
    const form = new FormData()
    form.append('file', new File([blob], `${originalFile.name.replace(/\.[^.]+$/, '')}.${ext}`, { type: mime }))
    const res  = await fetch('/api/admin/upload/product-image', { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Erreur upload'); return null }
    return data.url
  }

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return
    setError(null)
    const files = accepted.slice(0, 6 - images.length)
    if (!files.length) return

    // Ouvre le crop sur le premier fichier, les suivants sont mis en queue
    const queue = files.map((file) => ({ src: URL.createObjectURL(file), file }))
    setCropQueue(queue)
  }, [images.length])

  async function handleCropConfirm(blob: Blob) {
    const current = cropQueue[0]
    if (!current) return

    setUploading(true)
    const url = await uploadBlob(blob, current.file)
    URL.revokeObjectURL(current.src)

    const remaining = cropQueue.slice(1)
    setCropQueue(remaining)

    if (url) onChange([...images, url])
    setUploading(false)

    // S'il reste des images en queue, le prochain modal s'ouvre automatiquement
  }

  function handleCropCancel() {
    // Annule l'image courante, passe à la suivante
    const current = cropQueue[0]
    if (current) URL.revokeObjectURL(current.src)
    setCropQueue((q) => q.slice(1))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [], 'image/avif': [], 'image/heic': [], 'image/heif': [] },
    maxFiles: 6 - images.length,
    disabled: uploading || images.length >= 6,
    noClick: true,
  })

  function removeImage(url: string) {
    onChange(images.filter((u) => u !== url))
  }

  return (
    <div className="space-y-3">
      {/* Miniatures existantes */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={i} className="group relative h-20 w-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full rounded-xl object-cover border border-[var(--line)]" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M2 2l6 6M8 2l-6 6" />
                </svg>
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] font-medium text-white">principal</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Zone de dépôt */}
      {images.length < 6 && (
        <div
          {...getRootProps()}
          className={[
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all',
            isDragActive ? 'border-amber bg-amber/5 text-amber' : 'border-[var(--line)] text-ink-3 hover:border-amber/50 hover:text-ink-2',
            (uploading || images.length >= 6) ? 'pointer-events-none opacity-40' : '',
          ].join(' ')}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <svg className="animate-spin text-amber" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
          )}
          <div>
            <p className="text-sm font-medium">
              {isDragActive ? 'Déposer ici' : uploading ? 'Upload en cours…' : 'Glisser une image ou'}
            </p>
            <p className="text-[11px]">JPG, PNG, WebP · max 5 Mo · {6 - images.length} image{6 - images.length > 1 ? 's' : ''} restante{6 - images.length > 1 ? 's' : ''}</p>
          </div>
          {!uploading && (
            <label className="rounded-lg border border-[var(--line-amber)] bg-amber/10 px-3 py-1.5 text-xs font-medium text-amber hover:bg-amber/20 transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
                multiple={images.length < 5}
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? [])
                  if (files.length) onDrop(files)
                  e.target.value = ''
                }}
              />
              Choisir depuis l'appareil
            </label>
          )}
        </div>
      )}

      {error && <p className="text-[12px] text-red-400">{error}</p>}

      {/* Modal de crop — s'ouvre pour chaque image sélectionnée */}
      {cropQueue.length > 0 && (
        <ImageCropModal
          src={cropQueue[0].src}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}

// ── Upload STL ─────────────────────────────────────────────────────────────────

function StlUpload({ stlUrl, onChange }: { stlUrl: string | null; onChange: (url: string | null) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    setError(null)
    setUploading(true)

    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/admin/upload/stl', { method: 'POST', body: form })
    const data = await res.json()

    if (!res.ok) setError(data.error ?? 'Erreur upload')
    else onChange(data.url)

    setUploading(false)
  }, [onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'model/stl':                    ['.stl'],
      'model/3mf':                    ['.3mf'],
      'application/octet-stream':     ['.stl', '.3mf'],
      'application/vnd.ms-pki.stl':   ['.stl'],
      'application/vnd.ms-3mfdocument': ['.3mf'],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  if (stlUrl) {
    const filename = decodeURIComponent(stlUrl.split('/').pop() ?? stlUrl).replace(/^\d+-[a-z0-9]+\./, '')
    const fileExt  = filename.split('.').pop()?.toUpperCase() ?? 'STL'
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber shrink-0">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6M9 15l3 3 3-3" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-0">{filename}</p>
          <p className="text-[11px] text-ink-3">Modèle {fileExt} chargé</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="cursor-pointer rounded-lg p-1.5 text-ink-3 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5h10M5 5V3.5h6V5M6 8v5M10 8v5M4 5l1 8h6l1-8" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all',
          isDragActive ? 'border-amber bg-amber/5 text-amber' : 'border-[var(--line)] text-ink-3 hover:border-amber/50 hover:text-ink-2',
          uploading ? 'pointer-events-none opacity-40' : '',
        ].join(' ')}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <svg className="animate-spin text-amber" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        )}
        <div>
          <p className="text-sm font-medium">{uploading ? 'Upload en cours…' : 'Glisser ou cliquer pour ajouter un modèle 3D'}</p>
          <p className="text-[11px]">Format .stl ou .3mf · max 50 Mo</p>
        </div>
      </div>
      {error && <p className="text-[12px] text-red-400">{error}</p>}
    </div>
  )
}

// ── Formulaire principal ───────────────────────────────────────────────────────

export default function AdminBoutiqueProductForm({ product, initialCategories = [] }: Props) {
  const router = useRouter()
  const isEdit = !!product

  const [lang, setLang]               = useState<'fr' | 'en'>('fr')
  const [name, setName]               = useState(product?.name ?? '')
  const [slug, setSlug]               = useState(product?.slug ?? '')
  const [subtitle, setSubtitle]       = useState(product?.subtitle ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [nameEn, setNameEn]           = useState(product?.name_en ?? '')
  const [subtitleEn, setSubtitleEn]   = useState(product?.subtitle_en ?? '')
  const [descriptionEn, setDescriptionEn] = useState(product?.description_en ?? '')
  const [priceEuros, setPriceEuros]         = useState(product ? String(product.price / 100) : '')
  const [salePriceEuros, setSalePriceEuros] = useState(
    product?.sale_price !== null && product?.sale_price !== undefined ? String(product.sale_price / 100) : ''
  )
  const [images, setImages]           = useState<string[]>(product?.images ?? [])
  const [stlUrl, setStlUrl]           = useState<string | null>(product?.stl_url ?? null)
  const [stock, setStock]             = useState(product?.stock !== null && product?.stock !== undefined ? String(product.stock) : '')
  const [weightGrams, setWeightGrams] = useState(product ? String(product.weight_grams) : '100')
  const [customFields, setCustomFields] = useState<ProductCustomField[]>(product?.custom_fields ?? [])
  const [categories, setCategories]   = useState<ShopCategoryRow[]>(initialCategories)
  const [category, setCategory]       = useState<string>(product?.category ?? '')
  const [featured, setFeatured]       = useState(product?.featured ?? false)
  // Création inline de catégorie
  const [showNewCat, setShowNewCat]   = useState(false)
  const [newCatLabel, setNewCatLabel] = useState('')
  const [newCatLabelEn, setNewCatLabelEn] = useState('')
  const [newCatSaving, setNewCatSaving]   = useState(false)
  const [newCatError, setNewCatError]     = useState<string | null>(null)
  const [active, setActive]           = useState(product?.active ?? true)
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const slugValue = slug || (name ? generateSlug(name) : '')

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
    setCategory(data.key)
    setShowNewCat(false)
    setNewCatLabel('')
    setNewCatLabelEn('')
    setNewCatSaving(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const price = Math.round(parseFloat(priceEuros.replace(',', '.')) * 100)
    if (isNaN(price) || price <= 0) {
      setError('Prix invalide')
      setSaving(false)
      return
    }

    let salePrice: number | null = null
    if (salePriceEuros !== '') {
      salePrice = Math.round(parseFloat(salePriceEuros.replace(',', '.')) * 100)
      if (isNaN(salePrice) || salePrice <= 0) {
        setError('Prix promotionnel invalide')
        setSaving(false)
        return
      }
      if (salePrice >= price) {
        setError('Le prix promotionnel doit être inférieur au prix de base')
        setSaving(false)
        return
      }
    }

    const payload = {
      name, slug: slugValue, subtitle: subtitle || null, description,
      name_en: nameEn || null, subtitle_en: subtitleEn || null, description_en: descriptionEn || null,
      price, sale_price: salePrice, images,
      stl_url: stlUrl,
      stock: stock !== '' ? parseInt(stock, 10) : null,
      weight_grams: parseInt(weightGrams, 10) || 100,
      active,
      custom_fields: customFields,
      category: category || null,
      featured,
    }

    const url    = isEdit ? `/api/admin/boutique/products/${product!.id}` : '/api/admin/boutique/products'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
    if (!confirm('Supprimer ce produit ? Il sera archivé dans Stripe et retiré de la boutique.')) return
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

  const inputClass = 'w-full rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-2.5 text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none focus:border-amber transition-colors'
  const labelClass = 'block text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1.5'

  return (
    <main className="min-h-[calc(100dvh-72px)] bg-bg-0 px-4 pt-6 pb-12">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="flex cursor-pointer items-center gap-1.5 rounded-pill border border-[var(--line)] px-3 py-1.5 text-xs text-ink-2 hover:text-ink-0 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 3L5 8l5 5" /></svg>
            Retour
          </button>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-amber">Boutique · Admin</p>
            <h1 className="mt-0.5 text-2xl font-extrabold text-ink-0" style={{ letterSpacing: '-0.02em' }}>
              {isEdit ? 'Modifier le produit' : 'Nouveau produit'}
            </h1>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Sélecteur de langue */}
          <div className="flex gap-1 rounded-xl p-1" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            {([
              { key: 'fr' as const, flag: '🇫🇷', label: 'Français', badge: false },
              { key: 'en' as const, flag: '🇬🇧', label: 'English',  badge: !nameEn },
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
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Porte-clé décoratif hexagonal" required minLength={2} />
              </div>

              {/* Slug */}
              <div>
                <label className={labelClass}>Slug URL</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-3">/boutique/</span>
                  <input className={inputClass + ' pl-[80px]'} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder={name ? generateSlug(name) : 'auto-généré'} />
                </div>
                {!slug && name && <p className="mt-1 text-[11px] text-ink-3">Sera : /boutique/{generateSlug(name)}</p>}
              </div>

              {/* Sous-titre FR */}
              <div>
                <label className={labelClass}>Sous-titre <span className="text-ink-3 normal-case font-normal">(affiché sous le nom dans les cartes)</span></label>
                <input className={inputClass} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ex : PLA noir mat · Impression 3D" maxLength={80} />
              </div>

              {/* Description FR */}
              <div>
                <label className={labelClass}>Description <span className="text-ink-3 normal-case font-normal">— markdown supporté</span></label>
                <textarea className={inputClass + ' resize-none font-mono text-[13px]'} rows={6} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={"Description du produit…\n\n**Matériaux** : PLA\n- Résistant\n- Léger"} />
              </div>
            </>
          ) : (
            <>
              {/* Nom EN */}
              <div>
                <label className={labelClass}>Product name <span className="text-ink-3 normal-case font-normal">(English)</span></label>
                <input className={inputClass} value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="E.g. Hexagonal decorative keychain" maxLength={120} />
              </div>

              {/* Sous-titre EN */}
              <div>
                <label className={labelClass}>Subtitle <span className="text-ink-3 normal-case font-normal">(English)</span></label>
                <input className={inputClass} value={subtitleEn} onChange={(e) => setSubtitleEn(e.target.value)} placeholder="E.g. Matte black PLA · 3D printed" maxLength={80} />
              </div>

              {/* Description EN */}
              <div>
                <label className={labelClass}>Description <span className="text-ink-3 normal-case font-normal">— markdown supported</span></label>
                <textarea className={inputClass + ' resize-none font-mono text-[13px]'} rows={6} value={descriptionEn} onChange={(e) => setDescriptionEn(e.target.value)} placeholder={"Product description…\n\n**Material**: PLA\n- Heat resistant\n- Lightweight"} />
              </div>

              {!nameEn && (
                <div className="rounded-xl border border-amber/20 bg-amber/5 px-4 py-3 text-[12px] text-amber">
                  Aucun contenu anglais renseigné — la version française sera utilisée en fallback pour les visiteurs /en/.
                </div>
              )}
            </>
          )}

          {/* Prix + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prix (€) *</label>
              <div className="relative">
                <input className={inputClass + ' pr-8'} value={priceEuros} onChange={(e) => setPriceEuros(e.target.value)} placeholder="12.90" required />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-3">€</span>
              </div>
              {priceEuros && !isNaN(parseFloat(priceEuros.replace(',', '.'))) && (
                <p className="mt-1 text-[11px] text-ink-3">→ {formatPrice(Math.round(parseFloat(priceEuros.replace(',', '.')) * 100))}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Stock (vide = illimité)</label>
              <input className={inputClass} value={stock} onChange={(e) => setStock(e.target.value)} placeholder="∞" type="number" min="0" />
            </div>
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
                value={salePriceEuros}
                onChange={(e) => setSalePriceEuros(e.target.value)}
                placeholder="Vide = pas de promo"
                type="number"
                min="0"
                step="0.01"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-3">€</span>
            </div>
            {salePriceEuros && !isNaN(parseFloat(salePriceEuros.replace(',', '.'))) && (() => {
              const sp = Math.round(parseFloat(salePriceEuros.replace(',', '.')) * 100)
              const bp = Math.round(parseFloat(priceEuros.replace(',', '.')) * 100)
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
            <ImageDropzone images={images} onChange={setImages} />
          </div>

          {/* Fichier STL */}
          <div>
            <label className={labelClass}>Modèle 3D (.stl / .3mf) — optionnel</label>
            <p className="mb-2 text-[11px] text-ink-3">Permet au client de visualiser le produit en 3D. Le format .3mf supporte les couleurs multiples.</p>
            <StlUpload stlUrl={stlUrl} onChange={setStlUrl} />
          </div>

          {/* Champs personnalisés */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className={labelClass}>Champs personnalisés</label>
                <p className="text-[11px] text-ink-3 -mt-1">Demandés au client lors de la commande (ex : prénom, texte à graver)</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCustomFields((prev) => [
                    ...prev,
                    { key: `champ_${prev.length + 1}`, label: '', required: false },
                  ])
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--line-amber)] bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber hover:bg-amber/20 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
                Ajouter un champ
              </button>
            </div>

            {customFields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--line)] px-4 py-5 text-center text-[12px] text-ink-3">
                Aucun champ — ce produit ne nécessite pas de personnalisation
              </div>
            ) : (
              <div className="space-y-3">
                {customFields.map((field, i) => (
                  <div key={i} className="rounded-xl border border-[var(--line)] bg-bg-1 p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Champ {i + 1}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCustomFields((prev) => prev.map((f, j) => j === i ? { ...f, required: !f.required } : f))}
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
                          onClick={() => setCustomFields((prev) => prev.filter((_, j) => j !== i))}
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
                          onChange={(e) => setCustomFields((prev) => prev.map((f, j) => j === i
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
                          onChange={(e) => setCustomFields((prev) => prev.map((f, j) => j === i
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

          {/* Catégorie + Mis en avant */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={labelClass}>Catégorie</label>
              <Select
                value={category}
                onChange={setCategory}
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
                onClick={() => setFeatured((v) => !v)}
                className={['flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all', featured ? 'border-amber/40 bg-amber/10 text-amber' : 'border-[var(--line)] bg-bg-1 text-ink-3'].join(' ')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill={featured ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {featured ? 'Populaire' : 'Non mis en avant'}
              </button>
            </div>
          </div>

          {/* Poids + Actif */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Poids (grammes)</label>
              <div className="relative">
                <input className={inputClass + ' pr-8'} value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} type="number" min="1" />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-3">g</span>
              </div>
            </div>
            <div className="flex flex-col justify-end pb-0.5">
              <label className={labelClass}>Visibilité</label>
              <button
                type="button"
                onClick={() => setActive((v) => !v)}
                className={['flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all', active ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-[var(--line)] bg-bg-1 text-ink-3'].join(' ')}
              >
                <span className={['h-2 w-2 rounded-full', active ? 'bg-emerald-400' : 'bg-ink-3'].join(' ')} />
                {active ? 'Actif — visible' : 'Inactif — masqué'}
              </button>
            </div>
          </div>

          {/* Stripe info */}
          {isEdit && product?.stripe_product_id && (
            <div className="rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3 text-[12px] text-ink-3 space-y-1">
              <p className="font-mono">Stripe Product : <span className="text-ink-2">{product.stripe_product_id}</span></p>
              <p className="font-mono">Stripe Price&nbsp;&nbsp;: <span className="text-ink-2">{product.stripe_price_id}</span></p>
              <p className="text-[11px] mt-1">⚠ Modifier le prix crée un nouveau Stripe Price et archive l&apos;ancien.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
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
    </main>
  )
}
