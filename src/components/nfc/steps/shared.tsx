'use client'

import { z } from 'zod'
import { isVCard, byteLength, NFC_CHIP_BYTE_LIMIT } from '@/types/order'

// Schémas, types, constantes et atomes UI partagés par les étapes du formulaire NFC.
// Extrait de NfcOrderForm.tsx — aucun changement de comportement.

export type TFunc = (key: string) => string

// ─── Schémas par étape (factories i18n) ───────────────────────────────────────

export const buildConfigSchema = (t: TFunc) => z.object({
  nfc_url: z.string()
    .min(1, t('errors.destinationRequired'))
    .refine(
      (v) => isVCard(v) || /^https?:/i.test(v),
      t('errors.destinationInvalid'),
    )
    .refine(
      (v) => !isVCard(v) || byteLength(v) <= NFC_CHIP_BYTE_LIMIT,
      t('errors.vcardTooLong'),
    ),
})

export const buildQuantitySchema = (t: TFunc) => z.object({
  quantity: z.number({ invalid_type_error: t('errors.quantityRequired') }).int().min(5, t('errors.quantityMin')),
})

export const buildCoordsSchema = (t: TFunc) => z.object({
  company: z.string().min(2, t('errors.nameRequired')),
  email: z.string().email(t('errors.emailInvalid')),
  phone: z.string().min(8, t('errors.phoneInvalid')),
  sector: z.string().min(2, t('errors.sectorRequired')),
})

export const buildAddressSchema = (t: TFunc) => z.object({
  shipping_name: z.string().min(2, t('errors.nameRequired')),
  shipping_address: z.string().min(5, t('errors.addressRequired')),
  shipping_address2: z.string().optional(),
  shipping_city: z.string().min(2, t('errors.cityRequired')),
  shipping_postal_code: z.string().min(4, t('errors.postalInvalid')).max(6),
  shipping_country: z.string().length(2, t('errors.countryRequired')),
})

export const buildContactSchema = (t: TFunc) => buildCoordsSchema(t).merge(buildAddressSchema(t))

export const COUNTRY_CODES = [
  'FR',
  'GP', 'MQ', 'GF', 'RE', 'YT', 'NC', 'PF', 'PM', 'BL', 'MF',
  'BE', 'CH', 'LU', 'MC',
  'DE', 'IT', 'ES', 'PT', 'NL', 'AT', 'IE', 'SE', 'DK', 'FI',
  'PL', 'CZ', 'HU', 'RO', 'GR', 'BG', 'HR', 'SK', 'SI',
  'EE', 'LV', 'LT', 'CY', 'MT',
  'GB', 'NO', 'IS', 'LI',
  'US', 'CA', 'BR', 'AR', 'MX',
  'JP', 'KR', 'AU', 'NZ', 'SG', 'HK',
  'MA', 'TN', 'DZ', 'SN',
] as const
export const SECTOR_KEYS = ['restaurant', 'beauty', 'wellness', 'realEstate', 'craftsman', 'retail', 'agency', 'other'] as const

export const QUANTITY_PRESETS = [5, 10, 25, 50, 100, 250]

export type Config = z.infer<ReturnType<typeof buildConfigSchema>>
export type Quantity = z.infer<ReturnType<typeof buildQuantitySchema>>
export type Contact = z.infer<ReturnType<typeof buildContactSchema>>
export interface NfcFormData extends Config, Quantity, Contact { logo_url: string }

// ─── Styles partagés ──────────────────────────────────────────────────────────

export const inputCls = [
  'w-full rounded-xl px-4 py-3 text-sm text-ink-0 font-sans',
  'placeholder:text-ink-3 transition-all outline-none',
  'bg-[var(--hi-04)] border border-[var(--line-08)]',
  'focus:border-amber/40 focus:bg-[rgba(245,158,11,0.04)]',
].join(' ')

export const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-ink-3'
export const errorCls = 'text-xs text-red-400'

// ─── Atomes UI ────────────────────────────────────────────────────────────────

export function StepTitle({ num, title, sub }: { num: string; title: string; sub: string }) {
  return (
    <div className="mb-1">
      <div className="mb-3 inline-flex items-center">
        <span className="font-mono text-[11px] uppercase leading-none tracking-[0.16em] text-amber">
          {num}<span className="text-ink-3"> / 04</span>
        </span>
      </div>
      <h2 className="font-bold text-ink-0" style={{ fontSize: '1.4rem', letterSpacing: '-0.025em', lineHeight: 1.1 }}>{title}</h2>
      <p className="mt-1.5 text-sm text-ink-3">{sub}</p>
    </div>
  )
}

export function SubSection({ title, hint, children }: {
  title: string; hint: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span
          className="block h-1.5 w-1.5 shrink-0 rounded-full bg-amber"
          style={{ boxShadow: '0 0 10px var(--amber)' }}
        />
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-ink-0">{title}</span>
          <span className="text-[11px] text-ink-3">— {hint}</span>
        </div>
      </div>
      {children}
    </div>
  )
}

export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={labelCls}>{label}</label>
      {children}
      {error && <p className={errorCls}>{error}</p>}
    </div>
  )
}

export const Input = ({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={`${inputCls} ${className}`}
    {...props}
  />
)

export function BtnPrimary({ children, fullWidth, disabled, type = 'button', onClick }: {
  children: React.ReactNode; fullWidth?: boolean; disabled?: boolean
  type?: 'button' | 'submit'; onClick?: () => void
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-pill text-[15px] font-semibold text-[#1A1300] transition-all active:scale-[0.97] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 disabled:hover:brightness-100 ${fullWidth ? 'flex-1' : 'px-8'}`}
      style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
    >
      {children}
    </button>
  )
}

export function BtnSecondary({ children, type = 'button', onClick, disabled }: {
  children: React.ReactNode; type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="flex h-[52px] shrink-0 cursor-pointer items-center gap-2 rounded-pill border px-6 text-sm font-medium text-ink-2 transition-all active:scale-[0.97] hover:border-amber/30 hover:text-ink-1 disabled:cursor-not-allowed disabled:opacity-40"
      style={{ borderColor: 'var(--line-amber)', background: 'var(--glass-amber-40)' }}
    >
      {children}
    </button>
  )
}

export function ArrowRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
      <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function ArrowLeft() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" fill="none">
      <path d="M11 7H3M3 7L6.5 3.5M3 7L6.5 10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
