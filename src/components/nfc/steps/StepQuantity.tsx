'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { calcOrder, getUnitPrice, FREE_SHIPPING_QTY } from '@/types/order'
import { formatPrice } from '@/lib/utils'
import {
  buildQuantitySchema, QUANTITY_PRESETS, inputCls, labelCls, errorCls,
  StepTitle, BtnPrimary, BtnSecondary, ArrowLeft, ArrowRight,
  type Quantity, type NfcFormData,
} from './shared'

export default function StepQuantity({ defaultValues, onBack, onNext }: {
  defaultValues: Partial<NfcFormData>; onBack: () => void; onNext: (d: Quantity) => void
}) {
  const t = useTranslations('nfcForm')
  const quantitySchema = useMemo(() => buildQuantitySchema(t), [t])
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<Quantity>({
    resolver: zodResolver(quantitySchema),
    defaultValues: { quantity: defaultValues.quantity ?? 5 },
  })

  const qty = watch('quantity') ?? 5
  const { unitPrice, subtotal, shipping, total } = calcOrder(qty)
  const missingForFree = Math.max(0, FREE_SHIPPING_QTY - qty)
  const basePrice = getUnitPrice(5)
  const discountPct = Math.round((1 - unitPrice / basePrice) * 100)

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-6">
      <StepTitle num="02" title={t('quantity.title')} sub={t('quantity.sub')} />

      <div className="mt-6">
        <label className={labelCls}>{t('quantity.label')}</label>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {QUANTITY_PRESETS.map((value) => {
            const active = qty === value
            const popular = value === 50
            return (
              <button
                key={value}
                type="button"
                onClick={() => setValue('quantity', value, { shouldValidate: true })}
                className="relative flex flex-col cursor-pointer items-center rounded-xl py-3 px-2 text-center transition-all duration-200"
                style={active ? {
                  background: 'rgba(245,158,11,0.12)',
                  border: '1.5px solid rgba(245,158,11,0.6)',
                  boxShadow: '0 0 20px rgba(245,158,11,0.15)',
                } : {
                  background: 'var(--hi-03)',
                  border: '1px solid var(--line-07)',
                }}
              >
                {popular && (
                  <span
                    className="absolute -top-2 rounded-pill px-1.5 py-px text-[8px] font-bold uppercase tracking-wider"
                    style={{ background: 'var(--btn-primary-bg)', color: '#1A1300' }}
                  >
                    {t('quantity.popular')}
                  </span>
                )}
                <span className={`text-sm font-bold transition-colors ${active ? 'text-amber' : 'text-ink-1'}`}>{value}</span>
                <span className={`mt-0.5 text-[10px] font-mono transition-colors ${active ? 'text-amber/70' : 'text-ink-3'}`}>{formatPrice(getUnitPrice(value))}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--line)]" />
          <span className="text-xs text-ink-3">{t('quantity.or')}</span>
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>
        <div className="mt-3">
          <input
            type="number"
            {...register('quantity', { valueAsNumber: true })}
            placeholder={t('quantity.customPlaceholder')}
            min={5}
            className={`${inputCls} text-center font-mono`}
          />
          {errors.quantity && <p className={errorCls}>{errors.quantity.message}</p>}
        </div>
      </div>

      {/* Prix résumé */}
      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
      >
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">{t('quantity.unitPrice')}</span>
          <span className="font-mono text-ink-1">
            {discountPct > 0 && (
              <span className="mr-2 text-emerald-400">−{discountPct}%</span>
            )}
            {formatPrice(unitPrice)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">{t('quantity.subtotal', { qty })}</span>
          <span className="font-mono text-ink-1">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-ink-2">{t('quantity.shipping')}</span>
          {shipping === 0 ? (
            <span className="font-mono font-semibold text-emerald-400">{t('quantity.free')}</span>
          ) : (
            <span className="font-mono text-ink-1">{formatPrice(shipping)}</span>
          )}
        </div>
        <div className="my-1 h-px bg-[var(--line-amber)]" />
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-amber">{t('quantity.total')}</span>
          <span className="font-mono text-base font-bold text-amber">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Incitation livraison offerte */}
      {missingForFree > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-ink-3">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4h9v7H1zM10 6h3l2 2v3h-5z" />
              <circle cx="4" cy="11" r="1.3" /><circle cx="12" cy="11" r="1.3" />
            </svg>
            {t.rich('quantity.freeShippingHint', {
              count: missingForFree,
              amber: (chunks) => <span className="text-amber">{chunks}</span>,
            })}
          </div>
          <div className="h-1 overflow-hidden rounded-full" style={{ background: 'var(--line-07)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, (qty / FREE_SHIPPING_QTY) * 100)}%`,
                background: 'linear-gradient(90deg, rgba(245,158,11,0.5), #F59E0B)',
              }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <BtnSecondary type="button" onClick={onBack}><ArrowLeft /> {t('back')}</BtnSecondary>
        <BtnPrimary type="submit" fullWidth>{t('next')} <ArrowRight /></BtnPrimary>
      </div>
    </form>
  )
}
