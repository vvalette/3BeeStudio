import { getTranslations } from 'next-intl/server'
import Eyebrow from '@/components/ui/Eyebrow'
import Reveal from '@/components/ui/Reveal'
import SocialVideoCard from './SocialVideoCard'

const TIKTOK_VIDEOS = [
  { id: '7652319556232285473', label: 'BeeLid — Ikea Hack',           views: '9K' },
  { id: '7652624940654431510', label: '3BeeStudio — Impression 3D',   views: undefined },
  { id: '7656800991987191073', label: '3BeeStudio — Impression 3D',   views: undefined },
]

const INSTAGRAM_URL = 'https://www.instagram.com/3bee_studio_/'

async function fetchThumbnail(videoId: string): Promise<string | null> {
  try {
    const videoUrl = `https://www.tiktok.com/@3bee.studio/video/${videoId}`
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`,
      { next: { revalidate: 43200 } },
    )
    if (!res.ok) return null
    const data = await res.json() as { thumbnail_url?: string }
    return data.thumbnail_url ?? null
  } catch {
    return null
  }
}

export default async function VideoStrip() {
  const t = await getTranslations('videoStrip')
  const thumbnails = await Promise.all(TIKTOK_VIDEOS.map((v) => fetchThumbnail(v.id)))

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">

        <Reveal className="mb-12">
          <div className="mb-3">
            <Eyebrow>{t('eyebrow')}</Eyebrow>
          </div>
          <h2
            className="font-sans font-bold text-ink-0"
            style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.025em' }}
          >
            {t('heading')}
          </h2>
          <p className="mt-4 text-ink-2 text-sm sm:text-base max-w-md leading-relaxed">
            Regardez les pièces se fabriquer en direct, de l&apos;impression 3D à la finition, suivez chaque étape de la création.
          </p>
        </Reveal>

        <Reveal>
          <div className="flex flex-col sm:flex-row items-start justify-start gap-8">
            {TIKTOK_VIDEOS.map((v, i) => (
              <SocialVideoCard
                key={v.id}
                embedUrl={`https://www.tiktok.com/embed/v2/${v.id}`}
                externalUrl={`https://www.tiktok.com/@3bee.studio/video/${v.id}`}
                handle="@3bee.studio"
                label={v.label}
                thumbnailUrl={thumbnails[i] ?? null}
                views={v.views}
              />
            ))}
          </div>
        </Reveal>

        {/* Lien Instagram */}
        <Reveal className="mt-8 flex justify-start">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-pill border border-[var(--line)] bg-bg-1 px-5 py-2.5 text-sm font-medium text-ink-1 transition-colors hover:border-[var(--line-amber)] hover:text-amber cursor-pointer"
          >
            <InstagramIcon />
            Retrouvez-nous aussi sur Instagram
          </a>
        </Reveal>

      </div>
    </section>
  )
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
