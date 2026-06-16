'use client'

import dynamic from 'next/dynamic'

const STLViewer = dynamic(() => import('./STLViewer'), { ssr: false })

export default function STLViewerWrapper({
  url,
  height = 380,
  fill = false,
}: {
  url: string
  height?: number
  fill?: boolean
}) {
  return <STLViewer url={url} height={height} fill={fill} />
}
