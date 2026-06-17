'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import Eyebrow from '@/components/ui/Eyebrow'
import Reveal from '@/components/ui/Reveal'
import VideoModal from '@/components/ui/VideoModal'
import NFCKeychain3D from '@/components/landing/NFCKeychain3D'

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

/* Symbole NFC sans contact — arcs propres qui s'illuminent en cascade. */
function NFCWaves() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 8 A6 6 0 0 1 9 16" stroke="#FBBF24" strokeWidth="1.9" strokeLinecap="round"
        style={{ animation: 'nfc-arc 1.8s ease-in-out infinite', animationDelay: '0s' }} />
      <path d="M12 6 A8.5 8.5 0 0 1 12 18" stroke="#F59E0B" strokeWidth="1.7" strokeLinecap="round"
        style={{ animation: 'nfc-arc 1.8s ease-in-out infinite', animationDelay: '0.22s' }} />
      <path d="M15 4.5 A11 11 0 0 1 15 19.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"
        style={{ animation: 'nfc-arc 1.8s ease-in-out infinite', animationDelay: '0.44s' }} />
    </svg>
  )
}

const destinationKeys = ['social', 'website', 'contact', 'other'] as const

/* Icônes par type de destination. */
function DestinationIcon({ name }: { name: (typeof destinationKeys)[number] }) {
  const common = {
    width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none',
    stroke: '#FBBF24', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'social':
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17" cy="7" r="1.1" fill="#FBBF24" stroke="none" />
        </svg>
      )
    case 'website':
      return (
        <svg {...common} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
        </svg>
      )
    case 'contact':
      return (
        <svg {...common} aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <circle cx="9" cy="11" r="2" />
          <path d="M6 16c0-1.7 1.3-3 3-3s3 1.3 3 3M15 10h3M15 13.5h3" />
        </svg>
      )
    case 'other':
      return (
        <svg {...common} aria-hidden>
          <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" />
          <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" />
        </svg>
      )
  }
}

/* ── Keychain disc with embossed logo ── */
function Keychain() {
  const t = useTranslations('nfcSection')
  return (
    <div className="relative flex flex-col items-center" style={{ animation: 'float 6s ease-in-out infinite' }}>
      {/* Modèle 3D */}
      <NFCKeychain3D url="/stl/3beestudio_badge_final.3mf" />
      {/* Tag */}
      <div className="mt-4 flex items-center gap-1.5 rounded-pill border border-[var(--line-amber)] px-3 py-1.5"
        style={{ background: 'rgba(10,8,1,0.7)', backdropFilter: 'blur(8px)' }}>
        <span className="block h-1.5 w-1.5 rounded-full bg-amber" style={{ boxShadow: '0 0 6px var(--amber)' }} />
        <span className="font-mono text-amber-soft" style={{ fontSize: 9, letterSpacing: '0.08em' }}>{t('keychainTag')}</span>
      </div>
    </div>
  )
}

/* ── Phone mockup — browser opening chosen link ── */
function PhoneMockup() {
  const t = useTranslations('nfcSection')
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
                  <div style={{ fontSize: 9, color: '#888' }}>{t('mock.bio')}</div>
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                {[['124', t('mock.posts')], ['2,4k', t('mock.followers')], ['318', t('mock.following')]].map(([n, l]) => (
                  <div key={l} className="text-center flex-1">
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>{n}</div>
                    <div style={{ fontSize: 8, color: '#888' }}>{l}</div>
                  </div>
                ))}
              </div>

              <div className="text-center py-1.5 rounded-md font-sans font-semibold" style={{ fontSize: 11, background: '#0095F6', color: '#fff' }}>
                {t('mock.follow')}
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
  const t = useTranslations('nfcSection')
  const [videoOpen, setVideoOpen] = useState(false)

  return (
    <section className="py-20 lg:py-28 border-t border-[var(--line)]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">

        {/* Header */}
        <Reveal className="mb-12 max-w-2xl">
          <div className="mb-3"><Eyebrow>{t('eyebrow')}</Eyebrow></div>
          <h2 className="font-sans font-bold text-ink-0 mb-4" style={{ fontSize: 'clamp(1.875rem, 4vw, 3rem)', lineHeight: 1.04, letterSpacing: '-0.03em' }}>
            {t.rich('heading', { br: () => <br /> })}
          </h2>
          <p className="text-ink-2" style={{ fontSize: 'clamp(1rem, 1.3vw, 1.15rem)', lineHeight: 1.55 }}>
            {t.rich('subtitle', { br: () => <br /> })}
          </p>
        </Reveal>

        <Reveal delay={120} className="grid gap-6 lg:grid-cols-2 lg:gap-8 items-stretch">

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
            <div className="relative z-10 flex items-center justify-center w-full sm:flex-row">
              {/* Keychain — caché sur mobile */}
              <div className="hidden sm:flex flex-1 justify-end sm:pr-8"><Keychain /></div>

              {/* Connecteur NFC — caché sur mobile */}
              <div className="hidden sm:relative sm:flex items-center justify-center flex-shrink-0" style={{ width: 56, height: 56 }}>
                {[0, 0.8, 1.6].map((delay) => (
                  <span
                    key={delay}
                    aria-hidden
                    className="absolute rounded-full border"
                    style={{
                      width: 50, height: 50,
                      borderColor: 'rgba(245,158,11,0.55)',
                      animation: 'nfc-ripple 2.4s ease-out infinite',
                      animationDelay: `${delay}s`,
                    }}
                  />
                ))}
                <div className="relative flex items-center justify-center h-12 w-12 rounded-full border border-[var(--line-amber)]"
                  style={{ background: 'rgba(10,8,1,0.85)', backdropFilter: 'blur(8px)', boxShadow: '0 0 18px rgba(245,158,11,0.4)' }}>
                  <NFCWaves />
                </div>
              </div>

              {/* Téléphone — centré sur mobile, aligné à gauche sur desktop */}
              <div className="sm:flex-1 flex sm:justify-start sm:pl-12"><PhoneMockup /></div>
            </div>

            {/* URL caption */}
            <div className="absolute bottom-5 left-0 right-0 flex justify-center">
              <span className="font-mono text-ink-3" style={{ fontSize: 9, letterSpacing: '0.08em' }}>{t('urlCaption')}</span>
            </div>

            <VideoModal open={videoOpen} onClose={() => setVideoOpen(false)} src={VIDEO_SRC} />
          </div>

          {/* ── Right: pitch + order ── */}
          <div className="flex flex-col gap-5">
            <div
              className="relative flex-1 overflow-hidden border p-7"
              style={{
                borderRadius: 24,
                borderColor: 'var(--line-amber)',
                background: 'linear-gradient(160deg, #2A1C08 0%, #100A02 60%)',
              }}
            >
              {/* Déco hexagonale en fil de fer (cohérence section sur-mesure) */}
              <svg aria-hidden className="absolute pointer-events-none" style={{ right: -36, top: -48, opacity: 0.4 }} width="240" height="240" viewBox="0 0 240 240">
                <defs>
                  <linearGradient id="nfc-card-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#FBBF24" stopOpacity="0.6" />
                    <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M120 20 L200 60 L200 140 L120 180 L40 140 L40 60 Z" fill="none" stroke="url(#nfc-card-grad)" strokeWidth="0.8" />
                <path d="M120 50 L175 78 L175 132 L120 160 L65 132 L65 78 Z" fill="none" stroke="url(#nfc-card-grad)" strokeWidth="0.6" />
                <path d="M120 80 L150 96 L150 124 L120 140 L90 124 L90 96 Z" fill="none" stroke="url(#nfc-card-grad)" strokeWidth="0.4" />
                <circle cx="120" cy="20" r="2" fill="#F59E0B" />
                <circle cx="200" cy="60" r="2" fill="#F59E0B" />
              </svg>

              {/* Accent + titre */}
              <div className="relative mb-1.5 flex items-center gap-2.5">
                <span aria-hidden className="block h-4 w-1 rounded-full" style={{ background: 'linear-gradient(180deg, #FBBF24, #B45309)', boxShadow: '0 0 8px rgba(245,158,11,0.5)' }} />
                <p className="font-sans font-semibold text-ink-0" style={{ fontSize: 17 }}>
                  {t('pitchTitle')}
                </p>
              </div>
              <p className="relative text-ink-2 mb-5 pl-3.5" style={{ fontSize: 14, lineHeight: 1.55 }}>
                {t('pitchDesc')}
              </p>

              {/* Destinations — grille de mini-cartes */}
              <p className="relative mb-3 font-mono uppercase tracking-[0.14em] text-amber/70" style={{ fontSize: 10.5 }}>
                {t('destinationsTitle')}
              </p>
              <div className="relative grid grid-cols-2 gap-2.5">
                {destinationKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-2.5 rounded-lg border border-[var(--line-amber)] p-2.5 transition-colors hover:border-amber/50"
                    style={{ background: 'rgba(10,8,1,0.5)' }}
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ background: 'rgba(245,158,11,0.1)' }}>
                      <DestinationIcon name={key} />
                    </span>
                    <span className="text-ink-1 leading-snug" style={{ fontSize: 12 }}>{t(`destinations.${key}`)}</span>
                  </div>
                ))}
              </div>

              {/* Réassurance */}
              <div className="relative mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--line-amber)] pt-4">
                {(['noApp', 'noQr', 'noBattery', 'madeInFrance'] as const).map((f) => (
                  <span key={f} className="flex items-center gap-1.5 text-ink-2" style={{ fontSize: 11.5 }}>
                    <CheckIcon /> {t(`features.${f}`)}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Link
                href="/nfc#commander"
                className="flex h-[54px] w-full items-center justify-center gap-2 rounded-pill font-sans font-semibold text-[15px] text-[#1A1300] transition-all active:scale-[0.97] hover:brightness-105"
                style={{ background: 'var(--btn-primary-bg)', boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset' }}
              >
                {t('orderCta')} <ArrowIcon />
              </Link>
              <p className="text-center font-mono text-ink-3" style={{ fontSize: 11, letterSpacing: '0.04em' }}>
                {t.rich('priceLine', { amber: (chunks) => <span className="text-amber-soft">{chunks}</span> })}
              </p>
            </div>

            <button
              onClick={() => setVideoOpen(true)}
              className="flex h-[54px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-pill border border-[var(--line-amber)] font-sans font-semibold text-[15px] text-amber-soft transition-all active:scale-[0.97] hover:bg-[rgba(245,158,11,0.06)]"
              style={{ background: 'rgba(10,8,1,0.4)', backdropFilter: 'blur(8px)' }}
            >
              <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                <path d="M2.5 1.5L10 6L2.5 10.5V1.5Z" />
              </svg>
              {t('demoButton')}
            </button>

          </div>
        </Reveal>
      </div>
    </section>
  )
}
