'use client'

import { useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group } from 'three'
import {
  BookObject,
  IcosaObject,
  CoinsObject,
  VoiceObject,
  GemObject,
  type ObjectTarget,
} from './objects'
import { useLandingStore, type LandingSection } from '@/store/landing-store'

// ── Target layout per section ─────────────────────────────

type SceneTargets = {
  book:  ObjectTarget
  icosa: ObjectTarget
  coins: ObjectTarget
  voice: ObjectTarget
  gem:   ObjectTarget
}

const OFF_SCALE   = 0.70
const OFF_OPACITY = 0.20

function off(position: [number, number, number]): ObjectTarget {
  return { position, scale: OFF_SCALE, opacity: OFF_OPACITY }
}

function on(position: [number, number, number]): ObjectTarget {
  return { position, scale: 1.28, opacity: 1 }
}

const TARGETS: Record<LandingSection, SceneTargets> = {
  hero: {
    book:  { position: [-1.25,  0.95,  0.00], scale: 0.92, opacity: 0.88 },
    icosa: { position: [ 1.15,  0.80, -0.25], scale: 0.86, opacity: 0.82 },
    coins: { position: [-0.15, -0.85,  0.30], scale: 0.88, opacity: 0.85 },
    voice: { position: [ 1.05, -0.55,  0.10], scale: 0.84, opacity: 0.80 },
    gem:   { position: [-0.90, -0.45, -0.10], scale: 0.88, opacity: 0.80 },
  },
  transition: {
    book:  { position: [-1.15,  0.90, -0.30], scale: 0.74, opacity: 0.30 },
    icosa: { position: [ 1.05,  0.80, -0.40], scale: 0.74, opacity: 0.30 },
    coins: { position: [-0.10, -0.80, -0.10], scale: 0.78, opacity: 0.34 },
    voice: { position: [ 0.95, -0.55, -0.20], scale: 0.74, opacity: 0.30 },
    gem:   { position: [-0.85, -0.40, -0.30], scale: 0.78, opacity: 0.34 },
  },
  assignments: {
    book:  on([ 0.00,  0.00,  0.50]),
    icosa: off([ 1.50,  1.00, -0.65]),
    coins: off([-1.40, -1.10, -0.55]),
    voice: off([ 1.35, -0.95, -0.60]),
    gem:   off([-1.45,  0.95, -0.60]),
  },
  exams: {
    book:  off([-1.50,  1.00, -0.65]),
    icosa: on([ 0.00,  0.00,  0.50]),
    coins: off([-1.40, -1.10, -0.55]),
    voice: off([ 1.35, -0.95, -0.60]),
    gem:   off([ 0.10,  1.50, -0.75]),
  },
  expenses: {
    book:  off([-1.50,  1.00, -0.65]),
    icosa: off([ 1.40,  0.90, -0.60]),
    coins: on([ 0.00,  0.00,  0.50]),
    voice: off([ 1.35, -0.95, -0.60]),
    gem:   off([-1.40, -1.05, -0.55]),
  },
  voice: {
    book:  off([-1.50,  1.00, -0.65]),
    icosa: off([ 1.40,  0.90, -0.60]),
    coins: off([-1.40, -1.10, -0.55]),
    voice: on([ 0.00,  0.00,  0.50]),
    gem:   off([ 1.35, -0.95, -0.60]),
  },
  community: {
    book:  off([-1.50,  1.00, -0.65]),
    icosa: off([ 1.40,  0.90, -0.60]),
    coins: off([ 0.10,  1.50, -0.75]),
    voice: off([-1.35, -0.95, -0.60]),
    gem:   on([ 0.00,  0.00,  0.50]),
  },
  closer: {
    book:  { position: [-1.05,  0.80,  0.00], scale: 0.86, opacity: 0.72 },
    icosa: { position: [ 0.95,  0.75, -0.25], scale: 0.80, opacity: 0.68 },
    coins: { position: [-0.10, -0.80,  0.25], scale: 0.82, opacity: 0.70 },
    voice: { position: [ 0.95, -0.50,  0.10], scale: 0.78, opacity: 0.66 },
    gem:   { position: [-0.85, -0.40, -0.10], scale: 0.82, opacity: 0.70 },
  },
}

// ── Inner scene (runs inside Canvas context) ──────────────

function SceneContent() {
  const activeSection = useLandingStore((s) => s.activeSection)
  const reducedMotion = useLandingStore((s) => s.reducedMotion)

  const rootRef = useRef<Group>(null!)

  useFrame((_, delta) => {
    if (!rootRef.current || reducedMotion) return
    const sp = useLandingStore.getState().scrollProgress
    rootRef.current.rotation.y = THREE.MathUtils.lerp(
      rootRef.current.rotation.y,
      sp * Math.PI * 0.08,
      Math.min(1, delta * 1.5)
    )
  })

  const t = TARGETS[activeSection]

  return (
    <group ref={rootRef}>
      {/* Direction C lighting: single warm key, near-zero fill */}
      <pointLight position={[3, 4, 5]} intensity={1.4} color="#FFE8C0" />
      <ambientLight intensity={0.05} />

      <BookObject  target={t.book}  reduced={reducedMotion} />
      <IcosaObject target={t.icosa} reduced={reducedMotion} />
      <CoinsObject target={t.coins} reduced={reducedMotion} />
      <VoiceObject target={t.voice} reduced={reducedMotion} />
      <GemObject   target={t.gem}   reduced={reducedMotion} />
    </group>
  )
}

// ── Canvas — exported as dynamic() target ─────────────────

export default function Scene() {
  const setSceneLoaded = useLandingStore((s) => s.setSceneLoaded)

  useEffect(() => {
    setSceneLoaded(true)
    return () => setSceneLoaded(false)
  }, [setSceneLoaded])

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: '52%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 46 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <SceneContent />
      </Canvas>
    </div>
  )
}
