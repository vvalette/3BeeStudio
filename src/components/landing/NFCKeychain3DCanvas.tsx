'use client'

import { Suspense, useState, useMemo } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Center, Environment, Bounds } from '@react-three/drei'
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { Mesh, MeshStandardMaterial } from 'three'

const COLORS = [
  new MeshStandardMaterial({ color: '#F59E0B', roughness: 0.4, metalness: 0.1 }), // badge body — amber
  new MeshStandardMaterial({ color: '#111111', roughness: 0.8, metalness: 0.0 }), // logo — noir
]

function ThreeMFMesh({ url }: { url: string }) {
  const group = useLoader(ThreeMFLoader, url)

  const styled = useMemo(() => {
    let i = 0
    group.traverse((child) => {
      if ((child as Mesh).isMesh) {
        ;(child as Mesh).material = COLORS[Math.min(i, COLORS.length - 1)]
        i++
      }
    })
    return group
  }, [group])

  return (
    <Center>
      <primitive object={styled} />
    </Center>
  )
}

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

function Scene({ url }: { url: string }) {
  const [autoRotate, setAutoRotate] = useState(true)
  const is3mf = url.toLowerCase().endsWith('.3mf')
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 20, 10]} intensity={1.4} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.4} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.3}>
          {is3mf ? <ThreeMFMesh url={url} /> : <STLMesh url={url} />}
        </Bounds>
        <Environment preset="studio" />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        autoRotate={autoRotate}
        autoRotateSpeed={2}
        onStart={() => setAutoRotate(false)}
      />
    </>
  )
}

export default function NFCKeychain3DCanvas({ url }: { url: string }) {
  return (
    <Canvas
      camera={{ fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <Scene url={url} />
    </Canvas>
  )
}
