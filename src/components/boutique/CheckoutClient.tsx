'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import type { CartItem } from '@/types/cart'
import { calcShopShipping, splitCart, SHOP_FREE_SHIPPING_THRESHOLD } from '@/types/shop-product'
import type { DeliveryMode } from '@/types/shop-order'
import { formatPrice } from '@/lib/utils'
import { useCart } from './CartProvider'
import Select from '@/components/ui/Select'
import PhoneInput from '@/components/ui/PhoneInput'
import RelayPicker, { type SelectedRelay } from './RelayPicker'

// Europe + DOM-TOM + principales destinations mondiales (Colissimo)
const COUNTRY_CODES = [
  'FR',
  // DOM-TOM
  'GP', 'MQ', 'GF', 'RE', 'YT', 'NC', 'PF', 'PM', 'BL', 'MF',
  // Europe francophone proche
  'BE', 'CH', 'LU', 'MC',
  // EU
  'DE', 'IT', 'ES', 'PT', 'NL', 'AT', 'IE', 'SE', 'DK', 'FI',
  'PL', 'CZ', 'HU', 'RO', 'GR', 'BG', 'HR', 'SK', 'SI',
  'EE', 'LV', 'LT', 'CY', 'MT',
  // Hors-EU Europe
  'GB', 'NO', 'IS', 'LI',
  // Amériques
  'US', 'CA', 'BR', 'AR', 'MX',
  // Asie / Pacifique
  'JP', 'KR', 'AU', 'NZ', 'SG', 'HK',
  // Afrique / Maghreb
  'MA', 'TN', 'DZ', 'SN',
] as const

const MODES = ['relay', 'delivery', 'pickup'] as const

interface Props {
  // En mode « Acheter maintenant », les articles sont imposés et le panier est ignoré
  forcedItems?: CartItem[]
}

export default function CheckoutClient({ forcedItems }: Props) {
  const t       = useTranslations('boutique.checkoutForm')
  const tCommon = useTranslations('common')
  const locale  = useLocale()
  const cart   = useCart()
  const isBuyNow = !!forcedItems
  const items = forcedItems ?? cart.items
  const { freeShippingEnabled } = cart

  const [firstName, setFirstName]                     = useState('')
  const [lastName, setLastName]                       = useState('')
  const [email, setEmail]                             = useState('')
  const [phone, setPhone]                             = useState('')
  const [shippingFirstName, setShippingFirstName]     = useState('')
  const [shippingLastName, setShippingLastName]       = useState('')
  const [address, setAddress]           = useState('')
  const [address2, setAddress2]         = useState('')
  const [city, setCity]                 = useState('')
  const [postal, setPostal]             = useState('')
  const [country, setCountry]           = useState('FR')
  const [deliveryMode, setDeliveryMode]           = useState<DeliveryMode>('relay')
  const [relay, setRelay]                         = useState<SelectedRelay | null>(null)
  const [hasNewsletterDiscount, setHasDiscount]   = useState(false)
  const [digitalWaiver, setDigitalWaiver]         = useState(false)
  const [loading, setLoading]                     = useState(false)
  const [error, setError]                         = useState<string | null>(null)

  // Composition du panier : un panier 100 % fichiers n'a ni port, ni adresse, ni
  // mode de livraison à choisir. Un panier mixte reste une commande à expédier.
  const split = useMemo(() => splitCart(items.map((i) => ({
    product_type: i.is_digital ? 'digital' as const : 'physical' as const,
    unit_price: i.price,
    quantity: i.quantity,
  }))), [items])
  const digitalOnly = split.hasDigital && !split.hasPhysical

  const isPickup = !digitalOnly && deliveryMode === 'pickup'
  const isRelay  = !digitalOnly && deliveryMode === 'relay'
  // Le relais n'est desservi qu'en France métropolitaine par l'offre Boxtal
  const relayAvailable = country === 'FR'

  const countryOptions = useMemo(
    () => COUNTRY_CODES.map((c) => ({ value: c, label: tCommon(`countries.${c}`) })),
    [tCommon]
  )

  const { subtotal, discountAmount, shipping, total } = useMemo(() => {
    const subtotal      = split.subtotal
    const discountAmount = hasNewsletterDiscount ? Math.round(subtotal * 0.1) : 0
    // Port calculé sur la part physique seule (cf. splitCart) : sinon des fichiers
    // dans le panier feraient franchir le seuil de gratuité sans rien à expédier.
    const shipping      = items.length === 0 || freeShippingEnabled || !split.hasPhysical
      ? 0
      : calcShopShipping(split.physicalSubtotal, deliveryMode)
    return { subtotal, discountAmount, shipping, total: subtotal - discountAmount + shipping }
  }, [items, split, freeShippingEnabled, deliveryMode, hasNewsletterDiscount])

  // L'offre relais ne dessert que la France : hors FR, on repasse en domicile
  // (sinon le checkout resterait bloqué sur un sélecteur sans résultat).
  useEffect(() => {
    if (!relayAvailable && deliveryMode === 'relay') {
      setDeliveryMode('delivery')
      setRelay(null)
    }
  }, [relayAvailable, deliveryMode])

  // Vérifie la promo newsletter dès que l'email est valide
  useEffect(() => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setHasDiscount(false); return }
    const timer = setTimeout(() => {
      fetch(`/api/newsletter/check?email=${encodeURIComponent(email)}`)
        .then((r) => r.json())
        .then((d) => setHasDiscount(d.hasDiscount === true))
        .catch(() => setHasDiscount(false))
    }, 600)
    return () => clearTimeout(timer)
  }, [email])

  // Garde-fou : si le panier se vide (hors buy-now), on n'affiche plus le form
  const empty = items.length === 0

  // Scroll en haut au montage
  useEffect(() => { window.scrollTo(0, 0) }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (isRelay && !relay) {
      setError(t('relay.required'))
      return
    }
    // Le serveur refuse la commande sans ce consentement (art. L221-28 3°) : on le
    // signale ici pour éviter un aller-retour inutile.
    if (split.hasDigital && !digitalWaiver) {
      setError(t('digital.waiverRequired'))
      return
    }

    setLoading(true)

    const res = await fetch('/api/boutique/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity:   i.quantity,
          ...(i.custom_field_values ? { custom_field_values: i.custom_field_values } : {}),
        })),
        email,
        name: `${firstName} ${lastName}`.trim(),
        phone: phone || undefined,
        locale,
        delivery_mode: digitalOnly ? 'digital' : deliveryMode,
        ...(split.hasDigital ? { digital_waiver: digitalWaiver } : {}),
        ...(isRelay && relay ? {
          pickup_point_code:        relay.code,
          pickup_point_name:        relay.name,
          pickup_point_street:      relay.street,
          pickup_point_city:        relay.city,
          pickup_point_postal_code: relay.postalCode,
        } : {}),
        // Aucune adresse envoyée sur une commande sans colis : le serveur la
        // refuserait de toute façon, et c'est une donnée à ne pas collecter.
        ...(isPickup || digitalOnly ? {} : {
          shipping_name: `${shippingFirstName || firstName} ${shippingLastName || lastName}`.trim(),
          shipping_address:     address,
          shipping_address2:    address2 || undefined,
          shipping_city:        city,
          shipping_postal_code: postal,
          shipping_country:     country,
        }),
      }),
    })

    const data = await res.json().catch(() => ({ error: t('errorFallback') }))
    if (!res.ok) {
      setError(data.error ?? t('errorFallback'))
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
        <p className="text-ink-2">{t('emptyCart')}</p>
        <Link href="/boutique" className="mt-3 inline-block text-[13px] font-medium text-amber hover:text-amber-soft transition-colors">
          {t('backToShop')}
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] lg:items-start">

      {/* Formulaire */}
      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-6 order-2 lg:order-1">

        {/* Commande 100 % fichiers : rien à expédier, on l'annonce au lieu
            d'afficher un sélecteur de livraison à 0 €. */}
        {digitalOnly && (
          <div className="rounded-xl px-4 py-3.5" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="flex items-center gap-2 text-[13px] font-semibold text-amber">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v8M8 10L5 7M8 10l3-3M2.5 13h11" />
              </svg>
              {t('digital.title')}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{t('digital.description')}</p>
          </div>
        )}

        {/* Sélecteur mode de livraison — masqué s'il n'y a aucun colis */}
        {!digitalOnly && (
        <fieldset className="space-y-2">
          <legend className="mb-3 font-semibold text-ink-0">{t('deliveryTitle')}</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {MODES.filter((m) => m !== 'relay' || relayAvailable).map((mode) => {
              const isSelected = deliveryMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDeliveryMode(mode)}
                  className={[
                    'cursor-pointer flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-all',
                    isSelected
                      ? 'border-amber bg-amber/8 text-ink-0'
                      : 'border-[var(--line)] bg-bg-1 text-ink-2 hover:border-[var(--line-2)]',
                  ].join(' ')}
                >
                  {/* Icône */}
                  <div className={['mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors', isSelected ? 'bg-amber/15 text-amber' : 'bg-bg-2 text-ink-3'].join(' ')}>
                    {mode === 'delivery' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="7" width="13" height="11" rx="2"/>
                        <path d="M14 10h4l3 4.5V18h-7V10z"/>
                        <circle cx="5.5" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>
                      </svg>
                    ) : mode === 'relay' ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={['text-[13px] font-semibold leading-tight', isSelected ? 'text-ink-0' : 'text-ink-1'].join(' ')}>
                      {t(`${mode}Option`)}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-ink-3">
                      {t(`${mode}OptionDesc`)}
                    </p>
                  </div>
                  {isSelected && (
                    <svg className="mt-0.5 shrink-0 text-amber" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M3 8l3.5 3.5L13 5" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
          {isPickup && (
            <p className="rounded-lg border border-amber/20 bg-amber/5 px-3.5 py-3 text-[13px] text-ink-2 leading-relaxed">
              {t('pickupInfo')}
            </p>
          )}
          {isRelay && (
            <p className="rounded-lg border border-amber/20 bg-amber/5 px-3.5 py-3 text-[13px] text-ink-2 leading-relaxed">
              {t('relay.info')}
            </p>
          )}
        </fieldset>
        )}

        {/* Contact */}
        <fieldset className="space-y-4">
          <legend className="mb-2 font-semibold text-ink-0">{t('contactTitle')}</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('firstNameLabel')}</label>
              <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t('firstNamePlaceholder')} required minLength={2} autoComplete="off" />
            </div>
            <div>
              <label className={labelClass}>{t('lastNameLabel')}</label>
              <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t('lastNamePlaceholder')} required minLength={2} autoComplete="off" />
            </div>
          </div>
          <div>
            <label className={labelClass}>{t('emailLabel')}</label>
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('emailPlaceholder')} required autoComplete="off" />
          </div>
          <div>
            <label className={labelClass}>{t('phoneLabelRequired')}</label>
            <PhoneInput value={phone} onChange={setPhone} required />
          </div>
        </fieldset>

        {/* Adresse — masquée en retrait studio et sur un panier 100 % numérique */}
        {!isPickup && !digitalOnly && (
          <fieldset className="space-y-4">
            <legend className="mb-2 font-semibold text-ink-0">{t('addressTitle')}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>{t('shippingFirstNameLabel')}</label>
                <input className={inputClass} value={shippingFirstName} onChange={(e) => setShippingFirstName(e.target.value)} placeholder={firstName || t('shippingFirstNamePlaceholder')} autoComplete="off" />
              </div>
              <div>
                <label className={labelClass}>{t('shippingLastNameLabel')}</label>
                <input className={inputClass} value={shippingLastName} onChange={(e) => setShippingLastName(e.target.value)} placeholder={lastName || t('shippingLastNamePlaceholder')} autoComplete="off" />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('addressLabel')}</label>
              <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('addressPlaceholder')} required minLength={5} autoComplete="off" />
            </div>
            <div>
              <label className={labelClass}>{t('address2Label')}</label>
              <input className={inputClass} value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder={t('address2Placeholder')} autoComplete="off" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>{t('postalLabel')}</label>
                <input className={inputClass} value={postal} onChange={(e) => setPostal(e.target.value)} placeholder={t('postalPlaceholder')} required minLength={4} maxLength={6} autoComplete="off" />
              </div>
              <div>
                <label className={labelClass}>{t('cityLabel')}</label>
                <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder={t('cityPlaceholder')} required minLength={2} autoComplete="off" />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('countryLabel')}</label>
              <Select value={country} onChange={setCountry} options={countryOptions} />
            </div>

            {isRelay && (
              <div className="border-t border-[var(--line)] pt-4">
                <RelayPicker
                  postalCode={postal}
                  city={city}
                  street={address}
                  selected={relay}
                  onSelect={setRelay}
                />
              </div>
            )}
          </fieldset>
        )}

        {/* Renoncement au droit de rétractation — art. L221-28 3° du Code de la
            consommation. Sans consentement explicite recueilli AVANT le
            téléchargement, le client garde ses 14 jours sur un fichier déjà
            récupéré. Case volontairement décochée : un pré-cochage invaliderait
            le consentement. */}
        {split.hasDigital && (
          <fieldset>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--line)] bg-bg-0 px-4 py-3.5 transition-colors hover:border-[var(--line-amber)]">
              <input
                type="checkbox"
                checked={digitalWaiver}
                onChange={(e) => setDigitalWaiver(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-amber"
              />
              <span className="text-[12px] leading-relaxed text-ink-2">
                {t('digital.waiverLabel')}
              </span>
            </label>
          </fieldset>
        )}

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || (isRelay && !relay) || (split.hasDigital && !digitalWaiver)}
          className="w-full cursor-pointer rounded-pill bg-amber py-3.5 font-bold text-bg-0 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" /></svg>
              {t('loading')}
            </span>
          ) : isRelay && !relay ? (
            <>{t('relay.selectFirst')}</>
          ) : (
            <>{t('pay', { price: formatPrice(total) })}</>
          )}
        </button>

        <p className="text-center text-[11px] text-ink-3">
          {t('securePayment')}
        </p>
      </form>

      {/* Récap commande */}
      <aside className="order-1 lg:order-2 lg:sticky lg:top-[88px] rounded-2xl border border-[var(--line)] bg-bg-1 p-5">
        <h2 className="mb-4 font-semibold text-ink-0">
          {isBuyNow ? t('orderSummary') : t('cartSummary')}
        </h2>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.product_id} className="flex gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-bg-2">
                {item.image ? (
                  <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
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
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[13px] text-ink-0">{formatPrice(item.price * item.quantity)}</span>
                  {item.original_price !== null && (
                    <span className="font-mono text-[11px] text-ink-3 line-through">{formatPrice(item.original_price * item.quantity)}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {hasNewsletterDiscount && (
          <p className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2 text-[12px] text-emerald-400">
            {t('newsletterDiscountBadge')}
          </p>
        )}
        <div className="mt-4 space-y-1.5 border-t border-[var(--line)] pt-4 text-[13px]">
          <div className="flex justify-between text-ink-2">
            <span>{t('subtotal')}</span><span>{formatPrice(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>{t('newsletterDiscount')}</span><span>−{formatPrice(discountAmount)}</span>
            </div>
          )}
          {/* Pas de ligne livraison sans colis : afficher « Offerte » laisserait
              croire qu'un port a été remisé, alors qu'il n'y en a jamais eu. */}
          {!digitalOnly && (
            <div className="flex justify-between text-ink-2">
              <span>{isRelay ? t('relay.summaryLabel') : t('shipping')}</span>
              <span>{shipping === 0 ? t('shippingFree') : formatPrice(shipping)}</span>
            </div>
          )}
          {shipping > 0 && (
            <p className="text-[11px] text-ink-3">{t('freeShippingThreshold', { price: formatPrice(SHOP_FREE_SHIPPING_THRESHOLD) })}</p>
          )}
          {isRelay && relay && (
            <p className="rounded-lg border border-amber/20 bg-amber/5 px-2.5 py-2 text-[11px] leading-snug text-ink-2">
              <span className="font-semibold text-ink-1">{relay.name}</span><br />
              {relay.street}, {relay.postalCode} {relay.city}
            </p>
          )}
          <div className="flex justify-between border-t border-[var(--line)] pt-1.5 font-bold text-ink-0">
            <span>{t('total')}</span><span className="text-amber">{formatPrice(total)}</span>
          </div>
        </div>
      </aside>
    </div>
  )
}
