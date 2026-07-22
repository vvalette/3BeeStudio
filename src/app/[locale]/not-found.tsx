import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import Eyebrow from '@/components/ui/Eyebrow'

// 404 localisée — rendue pour toute URL inconnue sous [locale] (via le catch-all [...rest])
// et tout notFound() déclenché dans les pages (ex. fiche produit inexistante).
export default async function NotFound() {
  const locale = await getLocale()
  const t = await getTranslations({ locale, namespace: 'errorPages' })

  return (
    <div className="flex min-h-[calc(100dvh-72px)] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <Eyebrow>404</Eyebrow>
        <h1 className="mt-4 text-3xl font-bold text-ink-0 sm:text-4xl">{t('notFoundTitle')}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">{t('notFoundDesc')}</p>
        <Link
          href="/"
          className="mt-8 inline-flex cursor-pointer items-center justify-center rounded-pill px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
        >
          {t('backHome')}
        </Link>
      </div>
    </div>
  )
}
