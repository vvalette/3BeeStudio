'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  /** Délai avant l'apparition, en ms — pour décaler des éléments voisins. */
  delay?: number
  className?: string
}

/**
 * Apparition douce au scroll (fade + translation).
 * Le contenu reste dans le DOM dès le SSR — seul l'opacity/transform change.
 */
export default function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(18px)',
        transition: [
          `opacity 700ms cubic-bezier(0.2,0.7,0.2,1) ${delay}ms`,
          `transform 700ms cubic-bezier(0.2,0.7,0.2,1) ${delay}ms`,
        ].join(', '),
      }}
    >
      {children}
    </div>
  )
}
