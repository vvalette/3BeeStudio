'use client'

import { useEffect } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useCart } from './CartProvider'
import { formatPrice } from '@/lib/utils'
import { SHOP_FREE_SHIPPING_THRESHOLD } from '@/types/shop-product'

export default function CartDrawer() {
  const router = useRouter()
  const t = useTranslations('boutique.cart')
  const { items, isOpen, close, subtotal, shipping, total, setQuantity, removeItem, freeShippingEnabled } = useCart()

  // Bloque le scroll du body quand ouvert
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Fermeture clavier
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  const remaining = SHOP_FREE_SHIPPING_THRESHOLD - subtotal

  function goToCheckout() {
    close()
    router.push('/boutique/commande')
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={close}
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden
      />

      {/* Panneau */}
      <aside
        role="dialog"
        aria-label={t('title')}
        className={`fixed right-0 top-0 z-[70] flex h-full w-full max-w-md flex-col border-l border-[var(--line)] bg-bg-0 shadow-pop transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold text-ink-0">
            {t('title')}
            <span className="font-mono text-[12px] text-ink-3">
              {t('itemCount', { count: items.reduce((a, i) => a + i.quantity, 0) })}
            </span>
          </h2>
          <button
            onClick={close}
            aria-label={t('closeLabel')}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink-0"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Contenu */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-ink-3">
              <circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" />
              <path d="M2 2h2.5l2.2 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 6H5.2" />
            </svg>
            <p className="text-sm text-ink-2">{t('empty')}</p>
            <button onClick={close} className="cursor-pointer text-[13px] font-medium text-amber hover:text-amber-soft transition-colors">
              {t('continueShopping')}
            </button>
          </div>
        ) : (
          <>
            {/* Livraison offerte globale ou jauge seuil */}
            {freeShippingEnabled ? (
              <div className="border-b border-[var(--line)] bg-amber/5 px-5 py-2.5">
                <p className="text-[12px] font-medium text-amber">{t('freeShipping')}</p>
              </div>
            ) : shipping > 0 && remaining > 0 ? (
              <div className="border-b border-[var(--line)] bg-bg-1 px-5 py-3">
                <p className="text-[12px] text-ink-2">
                  {t.rich('progressMsg', { amount: formatPrice(remaining), b: (c) => <strong className="text-amber">{c}</strong> })}
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-3">
                  <div
                    className="h-full rounded-full bg-amber transition-all"
                    style={{ width: `${Math.min(100, (subtotal / SHOP_FREE_SHIPPING_THRESHOLD) * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}

            {/* Liste articles */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.product_id} className="flex gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[var(--line)] bg-bg-2">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-ink-3">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="m3 9 4-4 4 4 4-4 4 4" /></svg>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[14px] font-medium leading-tight text-ink-0">{item.name}</p>
                        <button
                          onClick={() => removeItem(item.product_id)}
                          aria-label={t('removeLabel')}
                          className="shrink-0 cursor-pointer text-ink-3 transition-colors hover:text-red-400"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                      </div>

                      <div className="mt-auto flex items-center justify-between pt-2">
                        {/* Quantité */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setQuantity(item.product_id, item.quantity - 1)}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-[var(--line)] text-ink-1 transition-colors hover:bg-bg-2"
                          >
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8h10" /></svg>
                          </button>
                          <span className="w-6 text-center font-mono text-[14px] text-ink-0">{item.quantity}</span>
                          <button
                            onClick={() => setQuantity(item.product_id, item.quantity + 1)}
                            disabled={item.max_stock !== null && item.quantity >= item.max_stock}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-[var(--line)] text-ink-1 transition-colors hover:bg-bg-2 disabled:opacity-30"
                          >
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
                          </button>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-[14px] font-semibold text-ink-0">{formatPrice(item.price * item.quantity)}</span>
                          {item.original_price !== null && (
                            <span className="font-mono text-[11px] text-ink-3 line-through">{formatPrice(item.original_price * item.quantity)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pied : totaux + CTA */}
            <div className="border-t border-[var(--line)] px-5 py-4 space-y-3">
              <div className="space-y-1.5 text-[13px]">
                <div className="flex justify-between text-ink-2">
                  <span>{t('subtotal')}</span><span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-ink-2">
                  <span>{t('shipping')}</span><span>{shipping === 0 ? t('shippingFree') : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between border-t border-[var(--line)] pt-1.5 font-bold text-ink-0">
                  <span>{t('total')}</span><span className="text-amber">{formatPrice(total)}</span>
                </div>
              </div>
              <button
                onClick={goToCheckout}
                className="w-full cursor-pointer rounded-pill bg-amber py-3 font-bold text-bg-0 transition-opacity hover:opacity-90"
              >
                {t('checkoutBtn')}
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
