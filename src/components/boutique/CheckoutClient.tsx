'use client'

import { useState, useMemo, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import type { CartItem } from '@/types/cart'
import { calcShopShipping, SHOP_FREE_SHIPPING_THRESHOLD } from '@/types/shop-product'
import { formatPrice } from '@/lib/utils'
import { useCart } from './CartProvider'

interface Props {
  // En mode « Acheter maintenant », les articles sont imposés et le panier est ignoré
  forcedItems?: CartItem[]
}

export default function CheckoutClient({ forcedItems }: Props) {
  const cart = useCart()
  const isBuyNow = !!forcedItems
  const items = forcedItems ?? cart.items

  const [name, setName]                 = useState('')
  const [email, setEmail]               = useState('')
  const [phone, setPhone]               = useState('')
  const [shippingName, setShippingName] = useState('')
  const [address, setAddress]           = useState('')
  const [address2, setAddress2]         = useState('')
  const [city, setCity]                 = useState('')
  const [postal, setPostal]             = useState('')
  const [country]                       = useState('FR')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const { subtotal, shipping, total } = useMemo(() => {
    const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0)
    const shipping = items.length > 0 ? calcShopShipping(subtotal) : 0
    return { subtotal, shipping, total: subtotal + shipping }
  }, [items])

  // Garde-fou : si le panier se vide (hors buy-now), on n'affiche plus le form
  const empty = items.length === 0

  // Scroll en haut au montage
  useEffect(() => { window.scrollTo(0, 0) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/boutique/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
        email,
        name,
        phone: phone || undefined,
        shipping_name:        shippingName || name,
        shipping_address:     address,
        shipping_address2:    address2 || undefined,
        shipping_city:        city,
        shipping_postal_code: postal,
        shipping_country:     country,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Une erreur est survenue. Réessayez.')
      setLoading(false)
      return
    }

    window.location.href = data.checkout_url
  }

  const inputClass = 'w-full rounded-xl border border-[var(--line)] bg-bg-0 px-4 py-2.5 text-sm text-ink-0 placeholder:text-ink-3 focus:outline-none focus:border-amber transition-colors'
  const labelClass = 'block text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1.5'

  if (empty) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-[var(--line)] py-16 text-center">
        <p className="text-ink-2">Votre panier est vide.</p>
        <Link href="/boutique" className="mt-3 inline-block text-[13px] font-medium text-amber hover:text-amber-soft transition-colors">
          Retour à la boutique →
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] lg:items-start">

      {/* Formulaire */}
      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6 order-2 lg:order-1">

        {/* Contact */}
        <fieldset className="space-y-4">
          <legend className="mb-2 font-semibold text-ink-0">Vos coordonnées</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Prénom / Nom *</label>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Marie Dupont" required minLength={2} />
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="marie@exemple.fr" required />
            </div>
          </div>
          <div>
            <label className={labelClass}>Téléphone (optionnel)</label>
            <input className={inputClass} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6 00 00 00 00" />
          </div>
        </fieldset>

        {/* Adresse */}
        <fieldset className="space-y-4">
          <legend className="mb-2 font-semibold text-ink-0">Adresse de livraison</legend>
          <div>
            <label className={labelClass}>Nom destinataire *</label>
            <input className={inputClass} value={shippingName} onChange={(e) => setShippingName(e.target.value)} placeholder={name || 'Marie Dupont'} required />
          </div>
          <div>
            <label className={labelClass}>Adresse *</label>
            <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 rue de la Paix" required minLength={5} />
          </div>
          <div>
            <label className={labelClass}>Complément (optionnel)</label>
            <input className={inputClass} value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Bâtiment B, Apt 4" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Code postal *</label>
              <input className={inputClass} value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="75001" required minLength={4} maxLength={6} />
            </div>
            <div>
              <label className={labelClass}>Ville *</label>
              <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" required minLength={2} />
            </div>
          </div>
        </fieldset>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full cursor-pointer rounded-pill bg-amber py-3.5 font-bold text-bg-0 transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" /></svg>
              Redirection vers Stripe…
            </span>
          ) : (
            <>Payer {formatPrice(total)} →</>
          )}
        </button>

        <p className="text-center text-[11px] text-ink-3">
          Paiement sécurisé par Stripe · SSL · Données chiffrées
        </p>
      </form>

      {/* Récap commande */}
      <aside className="order-1 lg:order-2 lg:sticky lg:top-[88px] rounded-2xl border border-[var(--line)] bg-bg-1 p-5">
        <h2 className="mb-4 font-semibold text-ink-0">
          {isBuyNow ? 'Votre commande' : 'Votre panier'}
        </h2>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.product_id} className="flex gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-bg-2">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-ink-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="3" /></svg>
                  </div>
                )}
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-3 px-1 font-mono text-[10px] text-ink-1 border border-[var(--line)]">
                  {item.quantity}
                </span>
              </div>
              <div className="flex flex-1 items-center justify-between gap-2">
                <span className="text-[13px] text-ink-1 leading-tight">{item.name}</span>
                <span className="font-mono text-[13px] text-ink-0">{formatPrice(item.price * item.quantity)}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-1.5 border-t border-[var(--line)] pt-4 text-[13px]">
          <div className="flex justify-between text-ink-2">
            <span>Sous-total</span><span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-2">
            <span>Livraison</span><span>{shipping === 0 ? 'Offerte' : formatPrice(shipping)}</span>
          </div>
          {shipping > 0 && (
            <p className="text-[11px] text-ink-3">Offerte dès {formatPrice(SHOP_FREE_SHIPPING_THRESHOLD)} d&apos;achat</p>
          )}
          <div className="flex justify-between border-t border-[var(--line)] pt-1.5 font-bold text-ink-0">
            <span>Total</span><span className="text-amber">{formatPrice(total)}</span>
          </div>
        </div>
      </aside>
    </div>
  )
}
