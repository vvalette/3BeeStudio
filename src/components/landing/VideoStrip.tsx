import { useTranslations } from 'next-intl'
import Eyebrow from '@/components/ui/Eyebrow'
import Reveal from '@/components/ui/Reveal'

const TIKTOK_URL = 'https://tiktok.com/@3beestudio'

interface VideoCardProps {
  title: string
  views: string
  accent?: boolean
  index: number
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="#FAFAFA" aria-hidden>
      <path d="M5 3 L14 9 L5 15 Z" />
    </svg>
  )
}

function VideoCard({ title, views, accent = false, index }: VideoCardProps) {
  const t = useTranslations('videoStrip')
  const patternId = `tri-${index}`
  return (
    <a
      href={TIKTOK_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('cardAria', { title })}
      className="group relative block overflow-hidden flex-shrink-0 w-[168px] h-[296px] lg:w-full lg:h-[360px] transition-transform duration-300 hover:-translate-y-1"
      style={{
        borderRadius: 24,
        background: accent
          ? 'linear-gradient(180deg, #2A1C08, #100A02)'
          : 'linear-gradient(180deg, #1A1A1F, #08080A)',
        border: accent ? '1px solid var(--line-amber)' : '1px solid var(--line)',
        boxShadow: accent ? 'var(--shadow-amber)' : 'var(--shadow-card)',
      }}
    >
      <svg aria-hidden className="absolute inset-0 w-full h-full" style={{ opacity: accent ? 0.5 : 0.25 }}>
        <defs>
          <pattern id={patternId} width="24" height="28" patternUnits="userSpaceOnUse">
            <path d="M12 2 L22 26 L2 26 Z" fill="none" stroke="rgba(245,158,11,0.5)" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      <div className="absolute top-3 left-3">
        <div className="px-2 py-1 rounded-full border border-[rgba(255,255,255,0.1)]" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
          <span className="font-mono text-ink-0" style={{ fontSize: 9, letterSpacing: '0.08em' }}>LIVE</span>
        </div>
      </div>

      <div
        className="absolute flex items-center justify-center rounded-full border border-[rgba(255,255,255,0.18)] transition-transform duration-300 group-hover:scale-110"
        style={{ top: '46%', left: '50%', transform: 'translate(-50%, -50%)', width: 56, height: 56, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)' }}
      >
        <PlayIcon />
      </div>

      <div className="absolute bottom-3 left-3 right-3">
        <div className="text-[13px] lg:text-[15px] font-semibold mb-1.5 leading-[1.25] text-ink-0">{title}</div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-ink-2" style={{ fontSize: 10 }}>▶ {views}</span>
          <span className="w-[3px] h-[3px] rounded-full bg-ink-3" />
          <span className="font-mono text-ink-2" style={{ fontSize: 10 }}>0:42</span>
        </div>
      </div>
    </a>
  )
}

const videos = [
  { title: 'Honeycomb vase, 14h print', views: '284K', accent: true },
  { title: 'Resin finish, slow-mo',     views: '91K',  accent: false },
  { title: 'Custom chess king',         views: '63K',  accent: false },
  { title: 'Behind the slicer',         views: '42K',  accent: false },
] as const

export default function VideoStrip() {
  const t = useTranslations('videoStrip')
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="flex items-end justify-between mb-8">
          <div>
            <div className="mb-3"><Eyebrow>{t('eyebrow')}</Eyebrow></div>
            <h2 className="font-sans font-bold text-ink-0" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
              {t('heading')}
            </h2>
          </div>
          <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer" className="font-mono text-amber whitespace-nowrap hover:text-amber-soft transition-colors" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
            {t('viewAll')}
          </a>
        </Reveal>

        {/* Mobile: scroll · Desktop: 4-col grid */}
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible">
          {videos.map((v, i) => (
            <VideoCard key={i} index={i} title={v.title} views={v.views} accent={v.accent} />
          ))}
        </div>
      </div>
    </section>
  )
}
