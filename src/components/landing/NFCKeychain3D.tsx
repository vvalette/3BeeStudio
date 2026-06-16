'use client'

import { Suspense, useState } from 'react'
import dynamic from 'next/dynamic'

const KeychainCanvas = dynamic(() => import('./NFCKeychain3DCanvas'), { ssr: false })

export default function NFCKeychain3D({ url }: { url: string }) {
  return (
    <div style={{ width: 200, height: 200, filter: 'drop-shadow(0 0 24px rgba(245,158,11,0.35))' }}>
      <Suspense fallback={null}>
        <KeychainCanvas url={url} />
      </Suspense>
    </div>
  )
}
