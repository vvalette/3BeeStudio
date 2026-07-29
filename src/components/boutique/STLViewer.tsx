'use client'

import { Suspense, useState, useMemo } from 'react'
import * as THREE from 'three'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Environment, Bounds } from '@react-three/drei'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js'

// Couleur du modèle : ambre en sombre, blanc cassé/crème neutre en mode clair
const MODEL_DARK  = '#F59E0B'
const MODEL_LIGHT = '#ECE8E0'
const DARK        = '#0A0A0B'

function STLMesh({ url, userRot, bodyColor }: { url: string; userRot: [number, number, number]; bodyColor: string }) {
  const geometry = useLoader(STLLoader, url)

  // Clone + center so the pivot is always the geometric center regardless of user rotation
  const centered = useMemo(() => {
    const g = geometry.clone()
    g.computeBoundingBox()
    g.center()
    return g
  }, [geometry])

  return (
    <group rotation={userRot}>
      {/* -90° X : correction système de coordonnées STL (Z-up → Y-up) */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={centered} castShadow receiveShadow>
          <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.1} />
        </mesh>
      </group>
    </group>
  )
}

function ThreeMFMesh({ url, userRot, bodyColor }: { url: string; userRot: [number, number, number]; bodyColor: string }) {
  const group = useLoader(ThreeMFLoader, url)

  const recolored = useMemo(() => {
    const clone  = group.clone(true)
    const matMap = new Map<string, THREE.MeshStandardMaterial>()
    let count = 0

    clone.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return
      const originals: THREE.Material[] = Array.isArray(node.material) ? node.material : [node.material]
      const replaced = originals.map((m) => {
        if (!matMap.has(m.uuid)) {
          matMap.set(m.uuid, new THREE.MeshStandardMaterial({
            color:     count === 0 ? bodyColor : DARK,
            roughness: 0.4,
            metalness: count === 0 ? 0.15 : 0.05,
          }))
          count++
        }
        return matMap.get(m.uuid)!
      })
      node.material = replaced.length === 1 ? replaced[0] : replaced
    })

    // Center the group so its bounding box center is at origin — pivot is always the geometric center
    const box = new THREE.Box3().setFromObject(clone)
    const center = box.getCenter(new THREE.Vector3())
    clone.position.sub(center)

    return clone
  }, [group, bodyColor])

  return (
    <group rotation={userRot}>
      <primitive object={recolored} />
    </group>
  )
}

function Scene({ url, rotation, bodyColor, lite }: { url: string; rotation?: { x: number; y: number; z: number }; bodyColor: string; lite: boolean }) {
  const [autoRotate, setAutoRotate] = useState(true)
  const is3mf = url.toLowerCase().endsWith('.3mf')
  const toRad = (d: number) => (d * Math.PI) / 180
  const userRot: [number, number, number] = [
    toRad(rotation?.x ?? 0),
    toRad(rotation?.y ?? 0),
    toRad(rotation?.z ?? 0),
  ]
  return (
    <>
      {/* En lite, l'envmap HDR est absente : les lumières compensent le fill perdu */}
      <ambientLight intensity={lite ? 1.0 : 0.6} />
      <directionalLight position={[10, 20, 10]} intensity={lite ? 1.5 : 1.2} castShadow={!lite} />
      <directionalLight position={[-10, -10, -5]} intensity={lite ? 0.5 : 0.3} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.4}>
          {is3mf ? <ThreeMFMesh url={url} userRot={userRot} bodyColor={bodyColor} /> : <STLMesh url={url} userRot={userRot} bodyColor={bodyColor} />}
        </Bounds>
        {/* Envmap « studio » : ~Mo de HDR externe + génération PMREM sur le thread
            principal — réservée au viewer plein format de la fiche produit. */}
        {!lite && <Environment preset="studio" />}
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

function Loader({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-3 text-ink-3">
      <svg className="animate-spin text-amber" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
      </svg>
      <span className="text-sm">{label}</span>
    </div>
  )
}

export default function STLViewer({ url, height = 380, fill = false, lite = false, rotation }: { url: string; height?: number; fill?: boolean; lite?: boolean; rotation?: { x: number; y: number; z: number } }) {
  const t = useTranslations('boutique.viewer')
  const { resolvedTheme } = useTheme()
  const bodyColor = resolvedTheme === 'dark' ? MODEL_DARK : MODEL_LIGHT
  return (
    <div
      className={fill ? 'relative w-full h-full overflow-hidden bg-bg-1' : 'relative w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-1'}
      style={fill ? undefined : { height }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-pill border border-amber/30 bg-bg-0/80 px-2.5 py-1 backdrop-blur-sm">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span className="font-mono text-[10px] font-medium text-amber">{t('badge')}</span>
      </div>

      <div className="absolute bottom-3 right-3 z-10 rounded-pill border border-[var(--line)] bg-bg-0/80 px-2.5 py-1 backdrop-blur-sm">
        <span className="text-[10px] text-ink-3">{t('hint')}</span>
      </div>

      <Canvas camera={{ fov: 45 }} shadows={!lite} gl={{ antialias: !lite }} dpr={lite ? 1 : [1, 1.5]}>
        <Scene url={url} rotation={rotation} bodyColor={bodyColor} lite={lite} />
      </Canvas>

      <Suspense fallback={<Loader label={t('loading')} />}><></></Suspense>
    </div>
  )
}
