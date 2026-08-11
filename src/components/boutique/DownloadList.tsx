import { getTranslations } from 'next-intl/server'
import type { PublicDownload } from '@/types/shop-order'

/**
 * Liste des fichiers achetés sur la page de suivi.
 *
 * Les liens pointent sur `/api/boutique/download/[orderId]` et non sur le stockage :
 * chaque clic consomme un jeton du quota et déclenche une URL signée de 2 minutes,
 * donc un lien copié-collé ne reste pas exploitable.
 *
 * Rendu côté serveur : le composant reçoit déjà les droits résolus, sans jamais
 * voir le chemin de stockage du fichier (cf. type PublicDownload).
 */
export default async function DownloadList({
  orderId,
  downloads,
}: {
  orderId: string
  downloads: PublicDownload[]
}) {
  if (downloads.length === 0) return null

  const t = await getTranslations('boutique.suivi.downloads')
  const first = downloads[0]
  const days = Math.max(
    1,
    Math.round((new Date(first.expires_at).getTime() - Date.now()) / (24 * 3600 * 1000)),
  )

  return (
    <div className="rounded-2xl border border-amber/25 bg-amber/5 p-5">
      <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber">{t('title')}</h2>
      <p className="mb-4 text-[12px] leading-relaxed text-ink-2">
        {t('description', { days, max: first.max_downloads })}
      </p>

      <ul className="space-y-2">
        {downloads.map((d) => {
          const expired = new Date(d.expires_at).getTime() <= Date.now()
          return (
            <li
              key={d.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--line)] bg-bg-1 px-4 py-3"
            >
              <svg className="shrink-0 text-amber" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 1.5H4A1.5 1.5 0 002.5 3v10A1.5 1.5 0 004 14.5h8a1.5 1.5 0 001.5-1.5V6L9 1.5z" />
                <path d="M9 1.5V6h4.5" />
              </svg>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink-0">{d.file_name}</p>
                <p className="font-mono text-[11px] text-ink-3">
                  {d.available
                    ? t('remaining', { remaining: d.max_downloads - d.download_count })
                    : expired ? t('expired') : t('exhausted')}
                </p>
              </div>

              {d.available ? (
                <a
                  href={`/api/boutique/download/${orderId}?file=${d.id}`}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-pill bg-amber px-4 py-2 text-[12px] font-bold text-bg-0 transition-opacity hover:opacity-90"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8 2v8M8 10L5 7M8 10l3-3M2.5 13h11" />
                  </svg>
                  {t('download')}
                </a>
              ) : (
                <span className="shrink-0 rounded-pill border border-[var(--line)] px-4 py-2 text-[12px] text-ink-3">
                  {expired ? t('expired') : t('exhausted')}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <p className="mt-3 text-[11px] leading-snug text-ink-3">{t('help')}</p>
    </div>
  )
}
