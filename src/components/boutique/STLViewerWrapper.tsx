'use client'

import dynamic from 'next/dynamic'

const STLViewer = dynamic(() => import('./STLViewer'), { ssr: false })

export default function STLViewerWrapper({
  url,
  height = 380,
  fill = false,
  lite = false,
  rotation,
}: {
  url: string
  height?: number
  fill?: boolean
  /** Rendu allégé pour les cartes catalogue : sans ombres, antialiasing ni
      envmap HDR — divise le coût CPU/GPU du canvas (INP sur les grilles). */
  lite?: boolean
  rotation?: { x: number; y: number; z: number }
}) {
  return <STLViewer url={url} height={height} fill={fill} lite={lite} rotation={rotation} />
}
