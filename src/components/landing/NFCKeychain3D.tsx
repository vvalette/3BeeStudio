'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'

const KeychainCanvas = dynamic(() => import('./NFCKeychain3DCanvas'), { ssr: false })

export default function NFCKeychain3D({ url, className }: { url: string; className?: string }) {
  const { resolvedTheme } = useTheme()
  // Halo ambré en sombre ; ombre portée douce en clair pour ancrer l'objet
  const glow = resolvedTheme === 'dark'
    ? 'drop-shadow(0 0 24px rgba(245,158,11,0.35))'
    : 'drop-shadow(0 16px 20px rgba(24,24,28,0.22))'
  return (
    <div className={className ?? 'h-[200px] w-[200px]'} style={{ filter: glow }}>
      <Suspense fallback={null}>
        <KeychainCanvas url={url} />
      </Suspense>
    </div>
  )
}
