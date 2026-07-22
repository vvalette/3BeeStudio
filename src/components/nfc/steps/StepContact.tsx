'use client'

import { useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import Select from '@/components/ui/Select'
import PhoneInput from '@/components/ui/PhoneInput'
import {
  buildContactSchema, COUNTRY_CODES, SECTOR_KEYS,
  StepTitle, SubSection, Field, Input, BtnPrimary, BtnSecondary, ArrowLeft, ArrowRight,
  type Contact, type NfcFormData,
} from './shared'

export default function StepContact({ defaultValues, onBack, onNext }: {
  defaultValues: Partial<NfcFormData>; onBack: () => void; onNext: (d: Contact) => void
}) {
  const t = useTranslations('nfcForm')
  const tCommon = useTranslations('common')
  const contactSchema = useMemo(() => buildContactSchema(t), [t])
  const sectorOptions = useMemo(() => SECTOR_KEYS.map((k) => t(`sectors.${k}`)), [t])
  const countryOptions = useMemo(
    () => COUNTRY_CODES.map((c) => ({ value: c, label: tCommon(`countries.${c}`) })),
    [tCommon],
  )
  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm<Contact>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      ...defaultValues,
      shipping_country: defaultValues.shipping_country ?? 'FR',
    },
  })

  // Local state for first/last split — combined into shipping_name
  const [shippingFirstName, setShippingFirstName] = useState(() => {
    const parts = (defaultValues.shipping_name ?? '').split(' ')
    return parts.length > 1 ? parts.slice(0, -1).join(' ') : (parts[0] ?? '')
  })
  const [shippingLastName, setShippingLastName] = useState(() => {
    const parts = (defaultValues.shipping_name ?? '').split(' ')
    return parts.length > 1 ? parts[parts.length - 1] : ''
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-7">
      <StepTitle num="03" title={t('contact.title')} sub={t('contact.sub')} />

      <SubSection title={t('contact.coordsTitle')} hint={t('contact.coordsHint')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('contact.company')} error={errors.company?.message}>
            <Input {...register('company')} placeholder={t('contact.companyPlaceholder')} autoComplete="off" autoFocus />
          </Field>
          <Field label={t('contact.email')} error={errors.email?.message}>
            <Input {...register('email')} type="email" placeholder="contact@entreprise.fr" autoComplete="off" />
          </Field>
          <Field label={t('contact.phone')} error={errors.phone?.message}>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  invalid={!!errors.phone}
                  required
                />
              )}
            />
          </Field>
          <Field label={t('contact.sector')} error={errors.sector?.message}>
            <Controller
              name="sector"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  options={sectorOptions}
                  placeholder={t('contact.sectorPlaceholder')}
                  invalid={!!errors.sector}
                />
              )}
            />
          </Field>
        </div>
      </SubSection>

      <SubSection title={t('contact.addressTitle')} hint={t('contact.addressHint')}>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('contact.recipientFirstName')} error={errors.shipping_name?.message}>
              <Input
                value={shippingFirstName}
                onChange={e => {
                  setShippingFirstName(e.target.value)
                  setValue('shipping_name', `${e.target.value} ${shippingLastName}`.trim(), { shouldValidate: true })
                }}
                placeholder={t('contact.recipientFirstNamePlaceholder')}
                autoComplete="off"
              />
            </Field>
            <Field label={t('contact.recipientLastName')}>
              <Input
                value={shippingLastName}
                onChange={e => {
                  setShippingLastName(e.target.value)
                  setValue('shipping_name', `${shippingFirstName} ${e.target.value}`.trim(), { shouldValidate: true })
                }}
                placeholder={t('contact.recipientLastNamePlaceholder')}
                autoComplete="off"
              />
            </Field>
          </div>
          <Field label={t('contact.address')} error={errors.shipping_address?.message}>
            <Input {...register('shipping_address')} placeholder={t('contact.addressPlaceholder')} autoComplete="off" />
          </Field>
          <Field label={t('contact.address2')} error={errors.shipping_address2?.message}>
            <Input {...register('shipping_address2')} placeholder={t('contact.address2Placeholder')} autoComplete="off" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('contact.postalCode')} error={errors.shipping_postal_code?.message}>
              <Input {...register('shipping_postal_code')} placeholder="75001" autoComplete="off" />
            </Field>
            <Field label={t('contact.city')} error={errors.shipping_city?.message}>
              <Input {...register('shipping_city')} placeholder="Paris" autoComplete="off" />
            </Field>
          </div>
          <Field label={t('contact.country')} error={errors.shipping_country?.message}>
            <Controller
              name="shipping_country"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  options={countryOptions}
                  placeholder={t('contact.countryPlaceholder')}
                  invalid={!!errors.shipping_country}
                />
              )}
            />
          </Field>
        </div>
      </SubSection>

      <div className="flex gap-3 pt-2">
        <BtnSecondary type="button" onClick={onBack}><ArrowLeft /> {t('back')}</BtnSecondary>
        <BtnPrimary type="submit" fullWidth>{t('next')} <ArrowRight /></BtnPrimary>
      </div>
    </form>
  )
}
