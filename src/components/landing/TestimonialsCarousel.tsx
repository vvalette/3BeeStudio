'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Eyebrow from '@/components/ui/Eyebrow'
import Reveal from '@/components/ui/Reveal'
import { GOOGLE_REVIEWS_URL } from '@/lib/links'

export interface Testimonial {
  id: string
  name: string
  role: string
  body: string
  avatar_gradient: string
  display_order: number
  source: string // 'manual' | 'google' — colonne text en DB
  rating: number
  avatar_url: string | null
  source_url: string | null
  country: string
}

/** Cartes affichées d'emblée sur desktop : 2 rangées × 3 colonnes. */
const VISIBLE_ON_DESKTOP = 6

const COUNTRY_FLAGS: Record<string, string> = {
  France: '🇫🇷',
  Belgique: '🇧🇪',
  Suisse: '🇨🇭',
  Luxembourg: '🇱🇺',
  Canada: '🇨🇦',
}

function StarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 10 10" fill="#FBBF24" aria-hidden>
      <path d="M5 0 L6.18 3.64 H10 L6.91 5.89 L8.09 9.53 L5 7.28 L1.91 9.53 L3.09 5.89 L0 3.64 H3.82 Z" />
    </svg>
  )
}

/* Logo Google multicolore — attribution requise par les CGU Places API
   quand on affiche des avis récupérés via l'API. */
function GoogleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.37l4.01-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.63l4.01 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  )
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={direction === 'left' ? 'M15 18 L9 12 L15 6' : 'M9 18 L15 12 L9 6'} />
    </svg>
  )
}

function TestimonialCard({ name, role, body, avatar_gradient, source, rating, avatar_url, source_url, country }: Omit<Testimonial, 'id' | 'display_order'>) {
  return (
    <div
      className="snap-start flex flex-col border border-[var(--line)] bg-bg-2 p-6 transition-colors hover:border-[var(--line-amber)]"
      style={{ borderRadius: 24, boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex gap-0.5 mb-4">
        {Array.from({ length: rating }).map((_, i) => <StarIcon key={i} />)}
      </div>
      <p className="text-ink-0 mb-5 flex-1" style={{ fontSize: 15, lineHeight: 1.55 }}>
        &ldquo;{body}&rdquo;
      </p>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar_url} alt="" className="w-10 h-10 rounded-full flex-shrink-0 border border-[var(--line)] object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full flex-shrink-0 border border-[var(--line)]" style={{ background: avatar_gradient }} />
          )}
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-ink-0 truncate">{name}</div>
            <div className="font-mono text-ink-2 mt-0.5" style={{ fontSize: 10, letterSpacing: '0.04em' }}>
              {role} {country && <span>· {COUNTRY_FLAGS[country] ?? country}</span>}
            </div>
          </div>
        </div>
        {source === 'google' && (
          <a
            href={source_url ?? GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Voir l'avis sur Google"
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
          >
            <GoogleIcon />
          </a>
        )}
      </div>
    </div>
  )
}

interface Props {
  items: Testimonial[]
  eyebrow: string
  heading: string
  prevLabel: string
  nextLabel: string
}

/**
 * Carrousel horizontal : une seule rangée qui défile au doigt sur mobile,
 * deux rangées de trois colonnes sur desktop (6 cartes visibles), le reste
 * s'atteignant aux flèches. Les flèches ne servent qu'à partir de `lg`, en
 * dessous le défilement tactile suffit.
 */
export default function TestimonialsCarousel({ items, eyebrow, heading, prevLabel, nextLabel }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  // Le nombre de colonnes hors écran dépend du breakpoint : on se fie à la
  // mesure réelle du conteneur plutôt qu'à un calcul sur items.length.
  const sync = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setAtStart(el.scrollLeft <= 1)
    setAtEnd(el.scrollLeft >= max - 1)
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', sync)
      ro.disconnect()
    }
  }, [sync])

  function scrollByPage(direction: 1 | -1) {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' })
  }

  const arrowClass = 'w-10 h-10 rounded-full border border-[var(--line)] bg-bg-2 text-ink-1 flex items-center justify-center transition-all cursor-pointer hover:text-amber hover:border-[var(--line-amber)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-ink-1 disabled:hover:border-[var(--line)]'

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">

        <Reveal className="mb-8 flex items-end justify-between gap-6">
          <div>
            <div className="mb-3"><Eyebrow>{eyebrow}</Eyebrow></div>
            <h2 className="font-sans font-bold text-ink-0" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', lineHeight: 1.05, letterSpacing: '-0.025em' }}>
              {heading}
            </h2>
          </div>
          {items.length > VISIBLE_ON_DESKTOP && (
            <div className="hidden lg:flex gap-2 flex-shrink-0 pb-1">
              <button type="button" onClick={() => scrollByPage(-1)} disabled={atStart} aria-label={prevLabel} className={arrowClass}>
                <ChevronIcon direction="left" />
              </button>
              <button type="button" onClick={() => scrollByPage(1)} disabled={atEnd} aria-label={nextLabel} className={arrowClass}>
                <ChevronIcon direction="right" />
              </button>
            </div>
          )}
        </Reveal>

        {items.length > 0 && (
          <Reveal delay={120}>
            <div
              ref={trackRef}
              className="grid grid-flow-col grid-rows-1 auto-cols-[280px] gap-4 overflow-x-auto pb-2 no-scrollbar snap-x lg:grid-rows-[auto_auto] lg:auto-cols-[calc((100%-3rem)/3)] lg:gap-6"
            >
              {items.map((item) => (
                <TestimonialCard key={item.id} {...item} />
              ))}
            </div>
          </Reveal>
        )}

      </div>
    </section>
  )
}
