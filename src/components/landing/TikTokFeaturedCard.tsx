'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Props {
  thumbnailUrl: string
  title: string
  videoId: string
  views: string
}

export default function TikTokFeaturedCard({ thumbnailUrl, title, videoId, views }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [open])

  return (
    <>
      <div className="mb-8 flex flex-col items-center lg:flex-row lg:items-center gap-8 lg:gap-12">
        {/* Portrait thumbnail card */}
        <button
          onClick={() => setOpen(true)}
          aria-label={`Regarder : ${title}`}
          className="group relative flex-shrink-0 w-full max-w-[280px] cursor-pointer overflow-hidden"
          style={{
            aspectRatio: '9/16',
            borderRadius: 20,
            border: '1px solid var(--line-amber)',
            boxShadow: 'var(--shadow-amber)',
          }}
        >
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="280px"
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }}
          />
          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110"
              style={{
                width: 64, height: 64,
                background: 'rgba(245,158,11,0.18)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(245,158,11,0.55)',
                boxShadow: '0 0 28px rgba(245,158,11,0.35)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="#F59E0B" aria-hidden>
                <path d="M5 3L17 10L5 17Z" />
              </svg>
            </div>
          </div>
          {/* Bottom label */}
          <div className="absolute bottom-4 left-4 right-4 text-left">
            <span className="font-mono text-[10px] text-white/50 tracking-wider">▶ {views} vues</span>
          </div>
        </button>

        {/* Info panel */}
        <div className="flex-1 text-center lg:text-left">
          <div
            className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full border border-[var(--line)]"
            style={{ background: 'var(--hi-04)' }}
          >
            <TikTokIcon />
            <span className="font-mono text-ink-3 text-[10px] tracking-wider">TIKTOK · @3BEE.STUDIO</span>
          </div>

          <h3
            className="font-sans font-bold text-ink-0 mb-3 leading-tight"
            style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', letterSpacing: '-0.025em' }}
          >
            {title}
          </h3>

          <p className="text-ink-2 text-sm mb-6 max-w-sm lg:max-w-none mx-auto lg:mx-0">
            Finis les couvercles qui traînent — le BeeLid™ permet de suspendre vos couvercles verticalement et de gagner de la place.
          </p>

          <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm cursor-pointer transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5"
              style={{
                background: 'var(--btn-primary-bg)',
                color: '#fff',
                boxShadow: 'var(--shadow-amber)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
                <path d="M3 2L12 7L3 12Z" />
              </svg>
              Regarder la vidéo
            </button>

            <a
              href={`https://www.tiktok.com/@3bee.studio/video/${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-ink-3 text-xs hover:text-amber transition-colors cursor-pointer"
            >
              Ouvrir sur TikTok →
            </a>
          </div>
        </div>
      </div>

      {/* Embed modal */}
      {open && (
        <div
          role="dialog"
          aria-modal
          aria-label={title}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="self-end mb-3 font-mono text-white/50 hover:text-white text-sm cursor-pointer transition-colors"
            >
              ✕ Fermer
            </button>
            <iframe
              src={`https://www.tiktok.com/embed/v2/${videoId}`}
              style={{ width: 325, height: 576, border: 'none', borderRadius: 16 }}
              allow="autoplay; encrypted-media"
              title={title}
            />
          </div>
        </div>
      )}
    </>
  )
}

function TikTokIcon() {
  return (
    <svg width="11" height="13" viewBox="0 0 11 13" fill="currentColor" className="text-ink-3" aria-hidden>
      <path d="M9.5 2.1A3.1 3.1 0 0 1 7.8 0H5.9v8.9a1.5 1.5 0 1 1-1.5-1.5c.14 0 .27.02.4.05V5.5A3.5 3.5 0 0 0 4.4 5.5a3.5 3.5 0 0 0 0 7 3.5 3.5 0 0 0 3.5-3.5V4.5a5 5 0 0 0 2.9.9V3.5a3.1 3.1 0 0 1-1.3-1.4z" />
    </svg>
  )
}
