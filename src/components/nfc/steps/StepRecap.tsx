'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { calcOrder, formatDestination } from '@/types/order'
import { formatPrice } from '@/lib/utils'
import { DestinationIcon } from '@/components/nfc/NfcLinkPicker'
import { Link } from '@/i18n/navigation'
import {
  COUNTRY_CODES,
  StepTitle, BtnSecondary, ArrowLeft, ArrowRight,
  type NfcFormData,
} from './shared'

export default function StepRecap({ formData, logoUrl, submitting, submitError, onBack, onEdit, onSubmit }: {
  formData: NfcFormData; logoUrl: string; submitting: boolean; submitError: string | null
  onBack: () => void; onEdit: (step: number) => void; onSubmit: () => void
}) {
  const t = useTranslations('nfcForm')
  const tCommon = useTranslations('common')
  const { unitPrice, subtotal, shipping } = calcOrder(formData.quantity)
  const [hasNewsletterDiscount, setHasNewsletterDiscount] = useState(false)

  useEffect(() => {
    if (!formData.email) return
    fetch(`/api/newsletter/check?email=${encodeURIComponent(formData.email)}`)
      .then((r) => r.json())
      .then((d: { hasDiscount: boolean }) => setHasNewsletterDiscount(d.hasDiscount))
      .catch(() => {})
  }, [formData.email])

  const discountedSubtotal = hasNewsletterDiscount ? Math.round(subtotal * 0.9) : subtotal
  const finalTotal = discountedSubtotal + shipping
  const discountAmount = subtotal - discountedSubtotal
  const code = formData.shipping_country
  const countryLabel = (COUNTRY_CODES as readonly string[]).includes(code) ? tCommon(`countries.${code}`) : code

  return (
    <div className="space-y-5">
      <StepTitle num="04" title={t('recap.title')} sub={t('recap.sub')} />

      {/* ── Produit ── */}
      <RecapSection icon={<TagMini />} title={t('recap.orderTitle')} onEdit={() => onEdit(1)}>
        <div className="flex items-center gap-4">
          {/* Logo dans son écrin */}
          <div
            className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl"
            style={{
              background: 'radial-gradient(circle at 50% 30%, rgba(245,158,11,0.16), var(--hi-03) 75%)',
              border: '1px solid rgba(245,158,11,0.3)',
              boxShadow: '0 0 24px rgba(245,158,11,0.12)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={t('recap.logoAlt')} className="h-14 w-14 rounded-lg object-contain" />
            <span
              className="absolute -bottom-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500"
              style={{ border: '2px solid var(--bg-1)' }}
              title={t('recap.logoValidated')}
            >
              <svg width="9" height="9" viewBox="0 0 11 11" fill="none">
                <path d="M2 5.5L4.5 8L9 3" stroke="#0A0A0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-ink-0">{t('recap.productName')}</p>
            <p className="mt-0.5 text-xs text-ink-3">{t('recap.productDesc')}</p>
            <div
              className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-pill px-2.5 py-1"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.22)' }}
            >
              <span className="flex shrink-0 text-amber"><DestinationIcon value={formData.nfc_url} size={12} /></span>
              <span className="truncate font-mono text-[11px] text-amber-soft">
                {formatDestination(formData.nfc_url)}
              </span>
            </div>
          </div>

          {/* Quantité */}
          <div
            className="flex shrink-0 flex-col items-center rounded-xl px-3.5 py-2"
            style={{ background: 'var(--hi-04)', border: '1px solid var(--line-08)' }}
          >
            <span className="font-mono text-lg font-bold leading-tight text-ink-0">×{formData.quantity}</span>
            <span className="font-mono text-[10px] text-ink-3">{formatPrice(unitPrice)} /u</span>
          </div>
        </div>
      </RecapSection>

      {/* ── Contact + Livraison ── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <RecapSection icon={<UserTiny />} title={t('recap.contactTitle')} onEdit={() => onEdit(3)}>
          <p className="text-sm font-semibold text-ink-0">{formData.company}</p>
          <p className="mt-0.5 text-xs text-ink-3">{formData.sector}</p>
          <div className="mt-3 space-y-2">
            <p className="flex items-center gap-2 text-[13px] text-ink-1">
              <span className="text-ink-3"><MailTiny /></span>
              <span className="truncate">{formData.email}</span>
            </p>
            <p className="flex items-center gap-2 text-[13px] text-ink-1">
              <span className="text-ink-3"><PhoneTiny /></span>
              {formData.phone}
            </p>
          </div>
        </RecapSection>

        <RecapSection icon={<PinTiny />} title={t('recap.shippingTitle')} onEdit={() => onEdit(3)}>
          <address className="text-[13px] not-italic leading-relaxed text-ink-1">
            <span className="font-semibold text-ink-0">{formData.shipping_name}</span><br />
            {formData.shipping_address}<br />
            {formData.shipping_address2 && <>{formData.shipping_address2}<br /></>}
            {formData.shipping_postal_code} {formData.shipping_city}
          </address>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-3">{countryLabel}</p>
        </RecapSection>
      </div>

      {/* ── Total — style reçu ── */}
      <div
        className="overflow-hidden rounded-2xl"
        style={{
          border: '1px solid rgba(245,158,11,0.28)',
          background: 'linear-gradient(180deg, rgba(245,158,11,0.10), rgba(245,158,11,0.03))',
        }}
      >
        <div className="space-y-2.5 px-5 pt-5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink-2">
              {t('recap.subtotal')} <span className="font-mono text-xs text-ink-3">{formData.quantity} × {formatPrice(unitPrice)}</span>
            </span>
            <span className={`font-mono ${hasNewsletterDiscount ? 'text-ink-3 line-through text-xs' : 'text-ink-1'}`}>{formatPrice(subtotal)}</span>
          </div>
          {hasNewsletterDiscount && (
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span>✨</span>
                <span>{t('recap.newsletterDiscount')}</span>
              </span>
              <span className="font-mono font-semibold text-emerald-400">−{formatPrice(discountAmount)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-ink-2">{t('recap.trackedShipping')}</span>
            {shipping === 0 ? (
              <span className="font-mono font-semibold text-emerald-400">{t('quantity.free')}</span>
            ) : (
              <span className="font-mono text-ink-1">{formatPrice(shipping)}</span>
            )}
          </div>
        </div>

        <div className="mx-5 my-4 border-t border-dashed" style={{ borderColor: 'rgba(245,158,11,0.3)' }} />

        <div className="flex items-end justify-between px-5 pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber/80">{t('quantity.total')}</p>
            <p className="mt-1 text-[34px] font-extrabold leading-none text-ink-0" style={{ letterSpacing: '-0.03em' }}>
              {formatPrice(finalTotal)}
            </p>
          </div>
          <p className="text-right text-[11px] leading-relaxed text-ink-3">
            {t.rich('recap.vat', { br: () => <br /> })}
          </p>
        </div>

        <div
          className="flex items-center justify-center gap-2 px-5 py-3"
          style={{ borderTop: '1px solid rgba(245,158,11,0.14)', background: 'var(--glass-amber-35)' }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="9" rx="1.5" stroke="var(--ink-2)" strokeWidth="1.2"/><path d="M4 4V3a3 3 0 016 0v1" stroke="var(--ink-2)" strokeWidth="1.2" strokeLinecap="round"/></svg>
          <span className="text-[11px] text-ink-2">{t('recap.securePayment')}</span>
        </div>
      </div>

      {submitError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {submitError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <BtnSecondary type="button" onClick={onBack} disabled={submitting}><ArrowLeft /> {t('back')}</BtnSecondary>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-pill text-[15px] font-semibold text-[#1A1300] transition-all active:scale-[0.97] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
          style={{
            background: submitting ? '#F59E0B' : 'var(--btn-primary-bg)',
            boxShadow: submitting ? 'none' : 'var(--btn-primary-shadow)',
          }}
        >
          {submitting ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
              </svg>
              {t('recap.redirecting')}
            </>
          ) : (
            <>{t('recap.pay', { amount: formatPrice(finalTotal) })} <ArrowRight /></>
          )}
        </button>
      </div>

      <p className="text-center text-[11px] text-ink-3">
        {t.rich('recap.consent', {
          cgv: (chunks) => <Link href="/cgv" target="_blank" rel="noopener noreferrer" className="text-amber/60 underline hover:text-amber transition-colors">{chunks}</Link>,
        })}
      </p>
    </div>
  )
}

// ─── Sections + mini-icônes du récap ─────────────────────────────────────────

function RecapSection({ icon, title, onEdit, children }: {
  icon: React.ReactNode; title: string; onEdit: () => void; children: React.ReactNode
}) {
  const t = useTranslations('nfcForm')
  return (
    <section
      className="overflow-hidden rounded-2xl"
      style={{ background: 'var(--hi-03)', border: '1px solid var(--line-07)' }}
    >
      <header className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
          <span className="flex text-amber/70">{icon}</span>
          {title}
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-amber/70 transition-colors hover:text-amber"
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 1.5l2.5 2.5L5 11.5l-3.2.7.7-3.2L10 1.5z" />
          </svg>
          {t('edit')}
        </button>
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

function TagMini() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.6 1.5H14v5.4l-7 7-5.4-5.4 7-7z" />
      <circle cx="11" cy="4.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function UserTiny() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="2.5" />
      <path d="M3 13c.8-2.4 2.7-3.3 5-3.3s4.2.9 5 3.3" />
    </svg>
  )
}

function PinTiny() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 14.5s5-4.4 5-8a5 5 0 10-10 0c0 3.6 5 8 5 8z" />
      <circle cx="8" cy="6.3" r="1.7" />
    </svg>
  )
}

function MailTiny() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
      <path d="M2 5l6 4 6-4" />
    </svg>
  )
}

function PhoneTiny() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 2.5h2l1.3 3.3-1.6 1a7 7 0 003.3 3.3l1-1.6 3.3 1.3v2a1.3 1.3 0 01-1.3 1.3A10.7 10.7 0 012.2 3.8 1.3 1.3 0 013.5 2.5z" />
    </svg>
  )
}
