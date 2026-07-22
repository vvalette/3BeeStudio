import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { buildAlternates } from '@/lib/seo'
import Eyebrow from '@/components/ui/Eyebrow'
import ContactForm from '@/components/contact/ContactForm'

type Props = { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'contactPage' })
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: buildAlternates('/contact', locale),
  }
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'contactPage' })

  return (
    <div className="mx-auto min-h-[calc(100dvh-72px)] max-w-2xl px-6 pb-24 pt-8 sm:pt-12">
      <Eyebrow>{t('eyebrow')}</Eyebrow>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-0 sm:text-4xl">
        {t('title')}
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-2">{t('subtitle')}</p>

      <div className="relative mt-8">
        <ContactForm />
      </div>

      <p className="mt-6 text-center text-[13px] text-ink-3">
        {t('directLine')}{' '}
        <a href="mailto:contact@3beestudio.fr" className="cursor-pointer font-medium text-amber hover:underline">
          contact@3beestudio.fr
        </a>
      </p>
    </div>
  )
}
