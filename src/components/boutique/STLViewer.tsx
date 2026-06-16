'use client'

import { Suspense, useState } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Center, Environment, Bounds } from '@react-three/drei'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js'

function STLMesh({ url }: { url: string }) {
  const geometry = useLoader(STLLoader, url)
  return (
    <Center>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial color="#F59E0B" roughness={0.4} metalness={0.1} />
        </mesh>
      </group>
    </Center>
  )
}

function ThreeMFMesh({ url }: { url: string }) {
  const group = useLoader(ThreeMFLoader, url)
  return (
    <Center>
      <primitive object={group} />
    </Center>
  )
}

function Scene({ url }: { url: string }) {
  const [autoRotate, setAutoRotate] = useState(true)
  const is3mf = url.toLowerCase().endsWith('.3mf')
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.4}>
          {is3mf ? <ThreeMFMesh url={url} /> : <STLMesh url={url} />}
        </Bounds>
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom
        autoRotate={autoRotate}
        autoRotateSpeed={1.5}
        onStart={() => setAutoRotate(false)}
      />
    </>
  )
}

function Loader() {
  return (
    <div className="flex h-full items-center justify-center gap-3 text-ink-3">
      <svg className="animate-spin text-amber" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
      </svg>
      <span className="text-sm">Chargement du modèle 3D…</span>
    </div>
  )
}

export default function STLViewer({ url, height = 380, fill = false }: { url: string; height?: number; fill?: boolean }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-1"
      style={fill ? { height: '100%' } : { height }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-pill border border-amber/30 bg-bg-0/80 px-2.5 py-1 backdrop-blur-sm">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span className="font-mono text-[10px] font-medium text-amber">Modèle 3D interactif</span>
      </div>

      <div className="absolute bottom-3 right-3 z-10 rounded-pill border border-[var(--line)] bg-bg-0/80 px-2.5 py-1 backdrop-blur-sm">
        <span className="text-[10px] text-ink-3">🖱 Faire glisser pour tourner · Molette pour zoomer</span>
      </div>

      <Canvas camera={{ fov: 45 }} shadows gl={{ antialias: true }}>
        <Scene url={url} />
      </Canvas>

      <Suspense fallback={<Loader />}><></></Suspense>
    </div>
  )
}
