'use client'

import { useTranslations, useLocale } from 'next-intl'
import { PRICE_TIERS, MIN_ORDER_QTY, FREE_SHIPPING_QTY, calcOrder, getShipping } from '@/types/order'

// Grille tarifaire de la page NFC, affichée AVANT le formulaire : le prix au
// porte-clé n'apparaissait qu'à l'étape 2, le visiteur devait donc uploader un
// logo pour savoir combien ça coûte. Tous les montants viennent de types/order.ts,
// jamais du texte des traductions : la grille ne peut pas mentir sur le prix payé.
// Chaque palier est cliquable et pilote le formulaire (voir NfcOrderSection).

const EXAMPLE_QTY = 50

export default function NfcPricing({ selectedQty, pending, onPick }: {
  /** Quantité en cours dans le formulaire, pour surligner le palier qui s'applique. */
  selectedQty: number | null
  /** La quantité est retenue mais l'étape 1 reste à remplir. */
  pending: boolean
  onPick: (qty: number) => void
}) {
  const t = useTranslations('nfcForm.pricing')
  const locale = useLocale()

  const money = (cents: number) =>
    new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(cents / 100)

  // Du plus petit palier au plus grand : sens de lecture du client.
  const tiers = [...PRICE_TIERS].reverse()
  const example = calcOrder(EXAMPLE_QTY)
  // Une quantité libre (60) surligne le palier qui la couvre (« dès 50 »).
  const activeMin = selectedQty ? PRICE_TIERS.find((tier) => selectedQty >= tier.min)?.min ?? null : null

  return (
    <section
      aria-labelledby="nfc-pricing-title"
      className="mb-4 rounded-2xl p-5 sm:p-6"
      style={{
        background: 'var(--glass-amber-50)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--line-amber)',
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="nfc-pricing-title"
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-amber"
        >
          {t('title')}
        </h2>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">{t('vat')}</p>
      </div>

      <p className="mt-2 text-sm text-ink-2">{t('sub')}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {tiers.map(({ min, unitPrice }) => {
          const active = activeMin === min
          return (
            <button
              key={min}
              type="button"
              aria-pressed={active}
              onClick={() => onPick(min)}
              className="flex cursor-pointer flex-col items-center rounded-xl px-2 py-3 text-center transition-all duration-200 hover:-translate-y-0.5"
              style={active ? {
                background: 'rgba(245,158,11,0.12)',
                border: '1.5px solid rgba(245,158,11,0.6)',
                boxShadow: '0 0 20px rgba(245,158,11,0.15)',
              } : {
                background: 'var(--hi-03)',
                border: '1px solid var(--line-07)',
              }}
            >
              <span className={`font-mono text-[10px] uppercase tracking-wider ${active ? 'text-amber/70' : 'text-ink-3'}`}>
                {t('fromQty', { qty: min })}
              </span>
              <span className="mt-1 text-sm font-bold text-amber">{money(unitPrice)}</span>
              <span className={`mt-0.5 text-[10px] ${active ? 'text-amber/70' : 'text-ink-3'}`}>{t('perUnit')}</span>
            </button>
          )
        })}
      </div>

      <p aria-live="polite" className="mt-3 text-xs text-ink-2">
        {pending && selectedQty
          ? <span className="text-amber">{t('saved', { qty: selectedQty })}</span>
          : selectedQty
            ? t('selected', { qty: selectedQty })
            : t('pickHint')}
      </p>

      <ul className="mt-3 space-y-1.5 border-t border-[var(--line-amber)] pt-3 text-xs text-ink-2">
        <li className="flex gap-2">
          <span aria-hidden className="text-amber">·</span>
          {t('minOrder', { qty: MIN_ORDER_QTY })}
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="text-amber">·</span>
          {t('shipping', {
            price: money(getShipping(MIN_ORDER_QTY)),
            priceFifty: money(getShipping(50)),
            free: FREE_SHIPPING_QTY,
          })}
        </li>
        <li className="flex gap-2">
          <span aria-hidden className="text-amber">·</span>
          <span>
            {t('example', {
              qty: EXAMPLE_QTY,
              subtotal: money(example.subtotal),
              shipping: money(example.shipping),
            })}{' '}
            <strong className="font-semibold text-ink-0">{money(example.total)}</strong>
          </span>
        </li>
      </ul>
    </section>
  )
}
