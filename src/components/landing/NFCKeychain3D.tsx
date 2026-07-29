'use client'

import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import { runWhenIdle } from '@/lib/utils'
import KeychainBadge2D from './KeychainBadge2D'

const KeychainCanvas = dynamic(() => import('./NFCKeychain3DCanvas'), { ssr: false })

/* Certains navigateurs (webviews Instagram/TikTok, Data Saver, WebGL désactivé)
   refusent la création d'un contexte WebGL — le canvas reste alors vide.
   On vérifie la capacité avant de charger le bundle 3D, et on retombe sur
   le badge 2D sinon. */
function canUseWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/* Filet de sécurité pour les erreurs runtime du rendu 3D (modèle corrompu,
   perte de contexte WebGL...) — retombe aussi sur le badge 2D plutôt que
   de laisser un espace vide ou de faire planter la section. */
class Canvas3DErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

export default function NFCKeychain3D({ url, className }: { url: string; className?: string }) {
  const { resolvedTheme } = useTheme()
  const [webglOK, setWebglOK] = useState<boolean | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Compile le bundle 3D (three.js + fiber + drei, ~600 Ko) pendant un temps mort
  // après l'hydratation : le parse/compile ne tombe ni dans le chargement initial
  // ni au milieu d'un clic pendant le scroll (INP 3 s mesuré sur / desktop).
  useEffect(() => runWhenIdle(() => { import('./NFCKeychain3DCanvas') }, 6000), [])

  // Le canvas lui-même n'est monté que lorsque la section approche du viewport,
  // et à un instant creux : l'init WebGL (longue tâche) ne bloque pas un clic en cours.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let cancelIdle: (() => void) | undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect()
          cancelIdle = runWhenIdle(() => setWebglOK(canUseWebGL()), 1000)
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => { observer.disconnect(); cancelIdle?.() }
  }, [])

  // Halo ambré en sombre ; ombre portée douce en clair pour ancrer l'objet
  const glow = resolvedTheme === 'dark'
    ? 'drop-shadow(0 0 24px rgba(245,158,11,0.35))'
    : 'drop-shadow(0 16px 20px rgba(24,24,28,0.22))'

  const fallback = <KeychainBadge2D className={className} />

  // Avant que la section soit proche du viewport, ou si WebGL indisponible :
  // badge 2D — garantit qu'on ne montre jamais un espace vide sur mobile.
  if (webglOK === false || webglOK === null) {
    return <div ref={containerRef} style={{ filter: glow }}>{fallback}</div>
  }

  return (
    <div className={className ?? 'h-[200px] w-[200px]'} style={{ filter: glow }}>
      <Canvas3DErrorBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <KeychainCanvas url={url} />
        </Suspense>
      </Canvas3DErrorBoundary>
    </div>
  )
}
