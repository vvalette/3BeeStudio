'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

const APPY_GEEK_URL = 'https://play.google.com/store/apps/details?id=com.AppyTech.appytech'

/**
 * Colonne partenaire du footer : l'appli Appy Geek, au même format que les
 * colonnes de navigation voisines.
 *
 * Titrée « Partenaire » et lien en `sponsored` : une publicité doit être
 * identifiable comme telle (LCEN art. 20).
 */
export default function PartnerColumn() {
  const t = useTranslations('footer.partner')

  return (
    <div>
      <div className="font-mono text-ink-3 mb-5" style={{ fontSize: 10, letterSpacing: '0.12em' }}>
        {t('eyebrow')}
      </div>
      <a
        href={APPY_GEEK_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={t('aria')}
        className="group flex cursor-pointer flex-col items-start gap-3"
      >
        <span>
          <span className="block font-semibold text-ink-1 transition-colors group-hover:text-amber" style={{ fontSize: 14 }}>
            Appy Geek
          </span>
          <span className="mt-1 block leading-relaxed text-ink-2" style={{ fontSize: 14, maxWidth: 220 }}>
            {t('tagline')}
          </span>
        </span>
        <Image
          src="/images/partners/google-play-badge-fr.svg"
          alt={t('badgeAlt')}
          width={861}
          height={255}
          unoptimized
          className="h-10 w-auto transition-opacity group-hover:opacity-85"
        />
      </a>
    </div>
  )
}
