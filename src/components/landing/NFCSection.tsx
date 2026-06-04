'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import Eyebrow from '@/components/ui/Eyebrow'
import VideoModal from '@/components/ui/VideoModal'

// Remplacer par l'URL de la vraie vidéo (MP4 ou YouTube)
const VIDEO_SRC = ''

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 7H11M11 7L7 3M11 7L7 11" stroke="#1A1300" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 7L5.5 10.5L12 3.5" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NFCWaves() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="7" cy="12" r="2" fill="#FBBF24" />
      <path d="M10.5 9A4.5 4.5 0 0 1 10.5 15" stroke="#FBBF24" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13.5 7A7.5 7.5 0 0 1 13.5 17" stroke="#F59E0B" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
      <path d="M16.5 5A10.5 10.5 0 0 1 16.5 19" stroke="#F59E0B" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
    </svg>
  )
}

const destinations = [
  'Instagram, TikTok ou LinkedIn',
  'Votre site web ou portfolio',
  'Un numéro de téléphone',
  'Une adresse email',
  'Tout autre lien',
] as const

/* ── Keychain disc with embossed logo ── */
function Keychain() {
  return (
    <div className="relative flex flex-col items-center" style={{ animation: 'float 6s ease-in-out infinite' }}>
      {/* Ring loop */}
      <div
        className="rounded-full border-2 border-[var(--line-amber)]"
        style={{ width: 16, height: 16, marginBottom: -4, background: 'transparent', borderColor: 'rgba(245,158,11,0.5)' }}
      />
      {/* Disc */}
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: 132, height: 132,
          background: 'radial-gradient(circle at 50% 35%, #2A1C08, #0A0A0B)',
          border: '1px solid var(--line-amber)',
          boxShadow: '0 0 40px rgba(245,158,11,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <Image
          src="/images/logo-bee-only.png"
          alt="Porte-clé 3D personnalisé avec votre logo"
          width={104}
          height={104}
          className="object-contain mix-blend-lighten drop-shadow-[0_0_18px_rgba(245,158,11,0.4)]"
        />
      </div>
      {/* Tag */}
      <div className="mt-4 flex items-center gap-1.5 rounded-pill border border-[var(--line-amber)] px-3 py-1.5"
        style={{ background: 'rgba(10,8,1,0.7)', backdropFilter: 'blur(8px)' }}>
        <span className="block h-1.5 w-1.5 rounded-full bg-amber" style={{ boxShadow: '0 0 6px var(--amber)' }} />
        <span className="font-mono text-amber-soft" style={{ fontSize: 9, letterSpacing: '0.08em' }}>PORTE CLÉ AVEC VOTRE LOGO</span>
      </div>
    </div>
  )
}

/* ── Phone mockup — browser opening chosen link ── */
function PhoneMockup() {
  return (
    <div className="relative" style={{ width: 172, filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.6))' }}>
      <div className="relative overflow-hidden" style={{ width: 172, borderRadius: 32, background: '#111113', border: '2px solid rgba(255,255,255,0.10)' }}>
        {/* Notch */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div style={{ width: 52, height: 7, borderRadius: 99, background: '#000' }} />
        </div>

        {/* Screen */}
        <div className="mx-1 mb-1 overflow-hidden" style={{ borderRadius: 26, background: '#fff' }}>
          {/* Browser chrome */}
          <div className="px-2.5 py-1.5 border-b" style={{ background: '#f4f4f4', borderColor: '#e0e0e0' }}>
            <div className="flex items-center gap-1.5 rounded-md px-2 py-1" style={{ background: '#fff', border: '1px solid #e0e0e0' }}>
              <span style={{ fontSize: 7, color: '#34C759' }}>🔒</span>
              <span style={{ fontSize: 8, color: '#666', fontFamily: 'monospace' }}>instagram.com/3bee_studio_</span>
            </div>
          </div>

          {/* Instagram-like profile */}
          <div style={{ background: '#fff' }}>
            <div className="px-3 pt-3 pb-2.5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex-shrink-0 rounded-full overflow-hidden" style={{ width: 40, height: 40, border: '2px solid #F59E0B', background: '#0A0A0B' }}>
                  <Image src="/images/logo-bee-only.png" alt="3bee.studio" width={40} height={40} className="object-contain p-1.5" />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#111' }}>3bee.studio</div>
                  <div style={{ fontSize: 9, color: '#888' }}>Studio 3D · Lyon 🇫🇷</div>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                {[['124', 'posts'], ['2,4k', 'abonnés'], ['318', 'suivis']].map(([n, l]) => (
                  <div key={l} className="text-center flex-1">
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>{n}</div>
                    <div style={{ fontSize: 8, color: '#888' }}>{l}</div>
                  </div>
                ))}
              </div>

              <div className="text-center py-1.5 rounded-md font-sans font-semibold" style={{ fontSize: 11, background: '#0095F6', color: '#fff' }}>
                S&apos;abonner
              </div>
            </div>

            <div className="grid grid-cols-3 gap-px" style={{ background: '#dbdbdb' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ aspectRatio: '1', background: ['#2A1C08','#1A1A1F','#161619','#1C1C20','#2A1C08','#1A1A1F'][i] }} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center py-1.5">
          <div style={{ width: 44, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.15)' }} />
        </div>
      </div>
    </div>
  )
}

export default function NFCSection() {
  const [videoOpen, setVideoOpen] = useState(false)

  return (
    <section className="py-20 lg:py-28 border-t border-[var(--line)]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">

        {/* Header */}
        <div className="mb-12 max-w-2xl">
          <div className="mb-3"><Eyebrow>Porte-clé connecté</Eyebrow></div>
          <h2 className="font-sans font-bold text-ink-0 mb-4" style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)', lineHeight: 1.04, letterSpacing: '-0.03em' }}>
            Le porte-clé connecté<br />qui parle pour vous.
          </h2>
          <p className="text-ink-2" style={{ fontSize: 'clamp(1rem, 1.3vw, 1.15rem)', lineHeight: 1.55 }}>
            Un porte-clé imprimé en 3D avec votre logo, avec une puce NFC intégrée.<br />
  
            Le client approche son téléphone et le lien de votre choix apparaît.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 items-stretch">

          {/* ── Left: the full story scene ── */}
          <div
            className="relative overflow-hidden flex items-center justify-center p-8 sm:p-10"
            style={{ borderRadius: 28, background: 'linear-gradient(155deg, #2A1C08 0%, #0A0A0B 70%)', border: '1px solid var(--line-amber)' }}
          >
            {/* Hex pattern */}
            <svg aria-hidden className="absolute inset-0 w-full h-full opacity-[0.18]">
              <defs>
                <pattern id="nfc-hex" x="0" y="0" width="44" height="50" patternUnits="userSpaceOnUse">
                  <path d="M22 1 L42 12 L42 36 L22 47 L2 36 L2 12 Z" fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#nfc-hex)" />
            </svg>
            {/* Glow */}
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 35% 40%, rgba(245,158,11,0.16), transparent 65%)' }} />

            {/* Scene: keychain → tap → phone */}
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center w-full gap-6 sm:gap-0">
              <div className="flex-1 flex justify-end sm:pr-8"><Keychain /></div>

              {/* Connection — centré absolument entre les deux éléments */}
              <div className="flex items-center justify-center flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-full border border-[var(--line-amber)]"
                  style={{ background: 'rgba(10,8,1,0.7)', backdropFilter: 'blur(8px)', animation: 'pulse-dot 2.4s ease-in-out infinite' }}>
                  <NFCWaves />
                </div>
              </div>

              <div className="flex-1 flex justify-start sm:pl-8"><PhoneMockup /></div>
            </div>

            {/* URL caption */}
            <div className="absolute bottom-5 left-0 right-0 flex justify-center">
              <span className="font-mono text-ink-3" style={{ fontSize: 9, letterSpacing: '0.08em' }}>EXEMPLE : votre page instagram</span>
            </div>

            <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} src={VIDEO_SRC} />
          </div>

          {/* ── Right: pitch + order ── */}
          <div className="flex flex-col gap-5">
            <div className="flex-1 rounded-xl border border-[var(--line)] bg-bg-2 p-7" style={{ borderRadius: 24 }}>
              <p className="font-sans font-semibold text-ink-0 mb-1.5" style={{ fontSize: 17 }}>
                Votre identité numérique, toujours à portée de main.
              </p>
              <p className="text-ink-2 mb-6" style={{ fontSize: 14, lineHeight: 1.55 }}>
                Approchez un smartphone et accédez immédiatement à votre page,
                sans application ni QR code.
              </p>
              <ul className="flex flex-col gap-3.5">
                {destinations.map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-bg-3 border border-[var(--line-amber)]">
                      <CheckIcon />
                    </span>
                    <span className="text-ink-1" style={{ fontSize: 14 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/nfc#commander"
              className="flex h-[54px] w-full items-center justify-center gap-2 rounded-pill font-sans font-semibold text-[15px] text-[#1A1300] transition-all active:scale-[0.97] hover:brightness-105"
              style={{ background: 'var(--btn-primary-bg)', boxShadow: 'var(--btn-primary-shadow)' }}
            >
              Commander mon porte-clé connecté <ArrowIcon />
            </Link>

            <button
              onClick={() => setVideoOpen(true)}
              className="flex h-[54px] w-full items-center justify-center gap-2.5 rounded-pill border border-[var(--line-amber)] font-sans font-semibold text-[15px] text-amber-soft transition-all active:scale-[0.97] hover:bg-[rgba(245,158,11,0.06)]"
              style={{ background: 'rgba(10,8,1,0.4)', backdropFilter: 'blur(8px)' }}
            >
              <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                <path d="M2.5 1.5L10 6L2.5 10.5V1.5Z" />
              </svg>
              Voir la démo du porte-clé connecté
            </button>

          </div>
        </div>
      </div>
    </section>
  )
}
