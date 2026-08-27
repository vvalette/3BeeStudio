'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import type { PublicShopProduct } from '@/types/shop-product'
import { colorLabel, effectivePrice } from '@/types/shop-product'
import { formatPrice } from '@/lib/utils'
import { useCart } from './CartProvider'
import { trackProductEvent } from './ProductViewTracker'

export default function AddToCartForm({ product }: { product: PublicShopProduct }) {
  const router = useRouter()
  const t = useTranslations('boutique.addToCart')
  const locale = useLocale()
  const { addItem, open } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})

  const colors = product.colors ?? []
  // Premier coloris présélectionné : la pièce est imprimée dans une couleur de
  // toute façon, un état « aucun choix » ne ferait qu'ajouter une erreur à
  // franchir. Le libellé retenu reste affiché en clair au-dessus des pastilles.
  const [colorKey, setColorKey] = useState(colors[0]?.key ?? null)
  const selectedColor = colors.find((c) => c.key === colorKey) ?? colors[0] ?? null

  const maxQty = product.stock !== null ? product.stock : 99
  const effPrice = effectivePrice(product)
  const hasCustomFields = product.custom_fields?.length > 0

  function validateFields(): boolean {
    if (!hasCustomFields) return true
    const errors: Record<string, boolean> = {}
    for (const f of product.custom_fields) {
      if (f.required && !fieldValues[f.key]?.trim()) errors[f.key] = true
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleAdd() {
    if (!validateFields()) return
    addItem({
      product_id:          product.id,
      name:                product.name,
      slug:                product.slug,
      price:               effPrice,
      original_price:      product.sale_price !== null ? product.price : null,
      image:               product.images[0] ?? null,
      max_stock:           product.stock,
      // Portée jusqu'au panier : c'est ce drapeau qui exclut la ligne du calcul
      // de port et dispense la commande d'adresse de livraison.
      ...(product.product_type === 'digital' ? { is_digital: true } : {}),
      // Le libellé voyage avec la ligne pour l'affichage du panier ; c'est `key`
      // que le checkout revalide contre la palette du produit.
      ...(selectedColor
        ? { color: { key: selectedColor.key, label: selectedColor.label, hex: selectedColor.hex } }
        : {}),
      custom_field_values: hasCustomFields ? { ...fieldValues } : undefined,
    }, quantity)
    // Deuxième étage de l'entonnoir admin : une fiche très vue qui ne déclenche
    // aucun ajout au panier ne se diagnostique pas avec les seules ventes.
    trackProductEvent(product.id, 'cart')
    open()
  }

  function handleBuyNow() {
    if (!validateFields()) return
    // « Acheter maintenant » saute le panier mais marque la même intention :
    // sans ça l'entonnoir sous-compterait les fiches sans personnalisation.
    trackProductEvent(product.id, 'cart')
    const params = new URLSearchParams({ product: product.id, qty: String(quantity) })
    if (selectedColor) params.set('color', selectedColor.key)
    router.push(`/boutique/commande?${params}`)
  }

  return (
    <div className="space-y-4">
      {/* Coloris */}
      {colors.length > 0 && (
        <div className="space-y-2.5 rounded-xl border border-[var(--line)] bg-bg-1 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{t('color')}</p>
            {selectedColor && (
              <p className="text-[13px] font-medium text-ink-0">{colorLabel(selectedColor, locale)}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((c) => {
              const selected = c.key === selectedColor?.key
              const label = colorLabel(c, locale)
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setColorKey(c.key)}
                  aria-pressed={selected}
                  aria-label={label}
                  title={label}
                  className={[
                    'relative h-9 w-9 cursor-pointer rounded-full border transition-all',
                    selected
                      ? 'border-amber ring-2 ring-amber ring-offset-2 ring-offset-bg-1'
                      : 'border-[var(--line-2)] hover:border-amber/60',
                  ].join(' ')}
                  style={{ backgroundColor: c.hex }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Champs personnalisés */}
      {hasCustomFields && (
        <div className="space-y-3 rounded-xl border border-[var(--line)] bg-bg-1 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">Personnalisation</p>
          {product.custom_fields.map((field) => {
            const label = (locale === 'en' && field.label_en) ? field.label_en : field.label
            const hasError = fieldErrors[field.key]
            return (
              <div key={field.key}>
                <label className="mb-1.5 block text-sm font-medium text-ink-1">
                  {label}
                  {field.required ? (
                    <span className="ml-1 text-amber">*</span>
                  ) : (
                    <span className="ml-1.5 text-[11px] font-normal text-ink-3">(optionnel)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={fieldValues[field.key] ?? ''}
                  onChange={(e) => {
                    setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    if (fieldErrors[field.key]) setFieldErrors((prev) => ({ ...prev, [field.key]: false }))
                  }}
                  autoComplete="off"
                  className={[
                    'w-full rounded-xl border px-4 py-2.5 text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none transition-colors bg-bg-0',
                    hasError ? 'border-red-400 focus:border-red-400' : 'border-[var(--line)] focus:border-amber',
                  ].join(' ')}
                  placeholder={label}
                />
                {hasError && (
                  <p className="mt-1 text-[11px] text-red-400">Ce champ est obligatoire</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Quantité */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{t('quantity')}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--line)] text-ink-0 transition-colors hover:bg-bg-1"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8h10" /></svg>
          </button>
          <span className="w-7 text-center font-mono text-[16px] font-bold text-ink-0">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--line)] text-ink-0 transition-colors hover:bg-bg-1 disabled:opacity-30"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
          </button>
        </div>
        {product.stock !== null && product.stock <= 5 && (
          <span className="text-[12px] text-amber">{t('lowStock', { count: product.stock })}</span>
        )}
      </div>

      {/* Boutons */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleAdd}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-pill border border-[var(--line-amber)] bg-amber/10 py-3 font-bold text-amber transition-colors hover:bg-amber/20"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
            <path d="M2 2h2.5l2.2 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 6H5.2" />
          </svg>
          {t('addToCartBtn')}
        </button>
        {!hasCustomFields && (
          <button
            type="button"
            onClick={handleBuyNow}
            className="w-full cursor-pointer rounded-pill bg-amber py-3 font-bold text-bg-0 transition-opacity hover:opacity-90"
          >
            {t('buyNow', { price: formatPrice(effPrice * quantity) })}
          </button>
        )}
      </div>
    </div>
  )
}
