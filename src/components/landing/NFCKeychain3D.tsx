'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'

const KeychainCanvas = dynamic(() => import('./NFCKeychain3DCanvas'), { ssr: false })

export default function NFCKeychain3D({ url }: { url: string }) {
  const { resolvedTheme } = useTheme()
  // Halo ambré uniquement en mode sombre, retiré en mode clair
  const glow = resolvedTheme === 'dark' ? 'drop-shadow(0 0 24px rgba(245,158,11,0.35))' : 'none'
  return (
    <div style={{ width: 200, height: 200, filter: glow }}>
      <Suspense fallback={null}>
        <KeychainCanvas url={url} />
      </Suspense>
    </div>
  )
}
