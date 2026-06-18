'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

interface Props {
  embedUrl:     string
  externalUrl:  string
  handle:       string
  label:        string
  thumbnailUrl: string | null
  views?:       string
}

export default function SocialVideoCard({ embedUrl, externalUrl, handle, label, thumbnailUrl, views }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [open])

  return (
    <>
      <div className="flex flex-col items-center gap-3 w-full" style={{ maxWidth: 210 }}>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Regarder : ${label}`}
          className="group relative w-full cursor-pointer overflow-hidden"
          style={{
            aspectRatio: '9/16',
            borderRadius: 20,
            border: '1px solid var(--line-amber)',
            boxShadow: 'var(--shadow-amber)',
          }}
        >
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={label}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="210px"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, #010101 0%, #1a1a2e 100%)' }}
            />
          )}

          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 55%, transparent 100%)' }}
          />

          <div className="absolute top-3.5 right-3.5 opacity-80">
            <TikTokIcon />
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex items-center justify-center rounded-full transition-all duration-300 group-hover:scale-110"
              style={{
                width: 60, height: 60,
                background: 'rgba(245,158,11,0.18)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(245,158,11,0.55)',
                boxShadow: '0 0 28px rgba(245,158,11,0.35)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="#F59E0B" aria-hidden>
                <path d="M5 3L17 10L5 17Z" />
              </svg>
            </div>
          </div>

          {views && (
            <div className="absolute bottom-3 left-4">
              <span className="font-mono text-[10px] text-white/60 tracking-wider">▶ {views}</span>
            </div>
          )}
        </button>

        <div className="text-center space-y-0.5">
          <p className="font-mono text-[11px] text-ink-3 tracking-wider">{handle}</p>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-amber hover:text-amber-soft transition-colors cursor-pointer"
          >
            Voir sur TikTok →
          </a>
        </div>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal
          aria-label={label}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
          onClick={() => setOpen(false)}
        >
          <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="self-end mb-3 font-mono text-white/50 hover:text-white text-sm cursor-pointer transition-colors"
            >
              ✕ Fermer
            </button>
            <iframe
              src={embedUrl}
              style={{ width: 325, height: 576, border: 'none', borderRadius: 16 }}
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              title={label}
            />
          </div>
        </div>
      )}
    </>
  )
}

function TikTokIcon() {
  return (
    <svg width="18" height="20" viewBox="0 0 20 22" fill="white" aria-hidden>
      <path d="M17.5 3.6A5.5 5.5 0 0 1 14 0h-3.4v15.1a2.6 2.6 0 1 1-2.6-2.5c.25 0 .48.03.7.09V9.2a6.2 6.2 0 0 0-.7-.04A6.3 6.3 0 0 0 1.7 21.4 6.3 6.3 0 0 0 14 15.1V7.7a9 9 0 0 0 5.3 1.7V5.9a5.5 5.5 0 0 1-1.8-2.3z" />
    </svg>
  )
}
