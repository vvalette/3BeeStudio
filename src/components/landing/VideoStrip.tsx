import { getTranslations } from 'next-intl/server'
import Eyebrow from '@/components/ui/Eyebrow'
import Reveal from '@/components/ui/Reveal'
import TikTokFeaturedCard from '@/components/landing/TikTokFeaturedCard'

const TIKTOK_PROFILE_URL = 'https://www.tiktok.com/@3bee.studio'
const FEATURED_VIDEO_ID = '7652267891596791062'
const FEATURED_VIDEO_URL = `https://www.tiktok.com/@3bee.studio/video/${FEATURED_VIDEO_ID}`

async function fetchTikTokOembed(videoUrl: string) {
  try {
    const res = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`,
      { next: { revalidate: 43200 } }
    )
    if (!res.ok) return null
    return await res.json() as { thumbnail_url: string; title: string }
  } catch {
    return null
  }
}

export default async function VideoStrip() {
  const t = await getTranslations('videoStrip')
  const oembed = await fetchTikTokOembed(FEATURED_VIDEO_URL)

  if (!oembed?.thumbnail_url) return null

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="flex items-end justify-between mb-10">
          <div>
            <div className="mb-3"><Eyebrow>{t('eyebrow')}</Eyebrow></div>
            <h2
              className="font-sans font-bold text-ink-0"
              style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.025em' }}
            >
              {t('heading')}
            </h2>
          </div>
          <a
            href={TIKTOK_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-amber whitespace-nowrap hover:text-amber-soft transition-colors cursor-pointer"
            style={{ fontSize: 11, letterSpacing: '0.06em' }}
          >
            {t('viewAll')}
          </a>
        </Reveal>

        <Reveal>
          <TikTokFeaturedCard
            thumbnailUrl={oembed.thumbnail_url}
            title="BeeLid - Ikea Hack"
            videoId={FEATURED_VIDEO_ID}
            views="9K"
          />
        </Reveal>
      </div>
    </section>
  )
}
