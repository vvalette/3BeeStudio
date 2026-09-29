'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'

const APPY_GEEK_URL = 'https://play.google.com/store/apps/details?id=com.AppyTech.appytech'

/**
 * Encart partenaire du footer : l'appli Appy Geek.
 *
 * Couleurs codées en dur, et non via les tokens du site : c'est la charte de
 * l'appli (bleu de ses captures Play Store), identique en thème clair et sombre.
 * Le lien est marqué `sponsored` et l'encart étiqueté « Partenaire » : une
 * publicité doit être identifiable comme telle (LCEN art. 20).
 */
export default function PartnerCard() {
  const t = useTranslations('footer.partner')

  return (
    <a
      href={APPY_GEEK_URL}
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label={t('aria')}
      className="group relative mt-8 flex h-[140px] w-full max-w-[320px] cursor-pointer overflow-hidden rounded-2xl border border-white/10 transition-transform duration-200 hover:-translate-y-0.5"
      style={{ background: 'linear-gradient(155deg, #122a4e 0%, #1c4a82 55%, #2d6aa8 100%)' }}
    >
      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-between p-4">
        <div>
          <span className="font-mono text-white/60" style={{ fontSize: 9, letterSpacing: '0.14em' }}>
            {t('eyebrow')}
          </span>
          <p className="mt-1 font-extrabold leading-none text-white" style={{ fontSize: 18, letterSpacing: '-0.02em' }}>
            Appy Geek
          </p>
          <p className="mt-1.5 leading-snug text-white/80" style={{ fontSize: 12 }}>
            {t('tagline')}
          </p>
        </div>
        <Image
          src="/images/partners/google-play-badge-fr.svg"
          alt={t('badgeAlt')}
          width={861}
          height={255}
          unoptimized
          className="h-8 w-auto self-start"
        />
      </div>

      {/* Capture de l'appli, coupée par le bas de la carte comme un téléphone qui dépasse */}
      <div className="relative w-[118px] shrink-0 self-end" style={{ height: 124 }}>
        <Image
          src="/images/partners/appy-geek-app.webp"
          alt=""
          aria-hidden
          width={335}
          height={277}
          sizes="118px"
          className="absolute right-[-18px] top-0 w-[150px] max-w-none rounded-t-[18px] shadow-2xl transition-transform duration-300 group-hover:-translate-y-1"
        />
      </div>
    </a>
  )
}
