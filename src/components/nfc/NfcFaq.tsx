import { useTranslations } from 'next-intl'
import JsonLd from '@/components/seo/JsonLd'
import { faqPageSchema } from '@/lib/schema'

/**
 * FAQ de la page NFC. Rendu en `<details>` natif (accessible, sans JS client,
 * contenu indexable). Le JSON-LD FAQPage utilise EXACTEMENT le même texte.
 */
export default function NfcFaq() {
  const t = useTranslations('nfcPage.faq')
  const items = t.raw('items') as { q: string; a: string }[]

  return (
    <section className="mt-16">
      <JsonLd data={faqPageSchema(items)} />

      <h2
        className="mb-6 text-center font-bold text-ink-0"
        style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.02em' }}
      >
        {t('heading')}
      </h2>

      <div className="flex flex-col gap-3">
        {items.map(({ q, a }) => (
          <details
            key={q}
            className="group rounded-lg border border-[var(--line)] bg-bg-1 [&_summary]:list-none"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4 font-medium text-ink-0">
              <span>{q}</span>
              <svg
                className="shrink-0 text-amber transition-transform duration-200 group-open:rotate-45"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
              >
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </summary>
            <p className="px-4 pb-4 text-ink-2" style={{ lineHeight: 1.6 }}>
              {a}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}
