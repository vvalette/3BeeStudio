'use client'

import { useEffect, useRef } from 'react'

interface VideoModalProps {
  open: boolean
  onClose: () => void
  src: string
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M5 3.5L12.5 8L5 12.5V3.5Z" fill="currentColor" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function VideoModal({ open, onClose, src }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const isYoutube = src.includes('youtube.com') || src.includes('youtu.be')

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open && videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" style={{ backdropFilter: 'blur(6px)' }} />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 flex items-center gap-1.5 text-ink-2 hover:text-ink-0 transition-colors font-mono"
          style={{ fontSize: 11, letterSpacing: '0.06em' }}
        >
          <CloseIcon /> FERMER
        </button>

        {/* Video container */}
        <div
          className="relative overflow-hidden"
          style={{ borderRadius: 20, border: '1px solid var(--line-amber)', background: '#000', aspectRatio: '9/16' }}
        >
          {src === '' ? (
            /* Placeholder — remplacer src par l'URL de la vidéo */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div
                className="flex items-center justify-center rounded-full border border-[var(--line-amber)]"
                style={{ width: 56, height: 56, background: 'rgba(245,158,11,0.1)' }}
              >
                <PlayIcon />
              </div>
              <p className="font-mono text-ink-3" style={{ fontSize: 11, letterSpacing: '0.08em' }}>
                VIDÉO À VENIR
              </p>
            </div>
          ) : isYoutube ? (
            <iframe
              src={src.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/') + '?autoplay=1'}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          ) : (
            <video
              ref={videoRef}
              src={src}
              controls
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>
      </div>
    </div>
  )
}
