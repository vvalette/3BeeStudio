'use client'

import React, { Suspense, useRef, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { Canvas, useLoader, useFrame } from '@react-three/fiber'
import { OrbitControls, Center, Environment, Bounds } from '@react-three/drei'
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { Mesh, MeshStandardMaterial, Group } from 'three'

// Couleur du porte-clé : ambre en sombre, blanc cassé/crème neutre en mode clair
const AMBER_DARK  = '#F59E0B'
const AMBER_LIGHT = '#ECE8E0'

function ThreeMFMesh({ url, bodyColor }: { url: string; bodyColor: string }) {
  const group = useLoader(ThreeMFLoader, url)

  const styled = useMemo(() => {
    const materials = [
      new MeshStandardMaterial({ color: bodyColor, roughness: 0.4, metalness: 0.1 }), // badge body
      new MeshStandardMaterial({ color: '#111111', roughness: 0.8, metalness: 0.0 }), // logo — noir
    ]
    let i = 0
    group.traverse((child) => {
      if ((child as Mesh).isMesh) {
        ;(child as Mesh).material = materials[Math.min(i, materials.length - 1)]
        i++
      }
    })
    return group
  }, [group, bodyColor])

  return (
    <Center>
      <primitive object={styled} />
    </Center>
  )
}

function STLMesh({ url, bodyColor }: { url: string; bodyColor: string }) {
  const geometry = useLoader(STLLoader, url)
  return (
    <Center>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <mesh geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.1} />
        </mesh>
      </group>
    </Center>
  )
}

function SwingGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.6) * 0.28
    }
  })
  return <group ref={ref}>{children}</group>
}

function Scene({ url, bodyColor }: { url: string; bodyColor: string }) {
  const is3mf = url.toLowerCase().endsWith('.3mf')
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 20, 10]} intensity={1.4} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.4} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.3}>
          <SwingGroup>
            {is3mf ? <ThreeMFMesh url={url} bodyColor={bodyColor} /> : <STLMesh url={url} bodyColor={bodyColor} />}
          </SwingGroup>
        </Bounds>
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls enablePan={false} enableZoom={false} />
    </>
  )
}

export default function NFCKeychain3DCanvas({ url }: { url: string }) {
  const { resolvedTheme } = useTheme()
  const bodyColor = resolvedTheme === 'dark' ? AMBER_DARK : AMBER_LIGHT
  return (
    <Canvas
      camera={{ fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <Scene url={url} bodyColor={bodyColor} />
    </Canvas>
  )
}
