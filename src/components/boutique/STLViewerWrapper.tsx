'use client'

import dynamic from 'next/dynamic'

const STLViewer = dynamic(() => import('./STLViewer'), { ssr: false })

export default function STLViewerWrapper({
  url,
  height = 380,
  fill = false,
  rotation,
}: {
  url: string
  height?: number
  fill?: boolean
  rotation?: { x: number; y: number; z: number }
}) {
  return <STLViewer url={url} height={height} fill={fill} rotation={rotation} />
}
