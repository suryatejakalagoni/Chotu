'use client'

import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { BookObject, ClockObject, CoinObject, GemObject, type ObjectTarget } from './objects'
import { useLandingStore, type LandingSection } from '@/store/landing-store'

/* ── Target state per section ────────────────────────── */
type SceneTargets = {
  book: ObjectTarget
  clock: ObjectTarget
  coin: ObjectTarget
  gem: ObjectTarget
}

const TARGETS: Record<LandingSection, SceneTargets> = {
  hero: {
    book:  { position: [-1.1, 0.85, 0],   scale: 1,    opacity: 1 },
    clock: { position: [1.0, 0.75, -0.4], scale: 1,    opacity: 1 },
    coin:  { position: [-0.85, -0.9, 0.3],scale: 1,    opacity: 1 },
    gem:   { position: [1.05, -0.8, 0],   scale: 1,    opacity: 1 },
  },
  assignments: {
    book:  { position: [0, 0, 0.5],        scale: 1.3,  opacity: 1   },
    clock: { position: [2.6, 0.6, -1.2],  scale: 0.7,  opacity: 0.28 },
    coin:  { position: [-2.4, -1.2, -0.8],scale: 0.7,  opacity: 0.28 },
    gem:   { position: [2.4, -1.0, -0.6], scale: 0.7,  opacity: 0.28 },
  },
  expenses: {
    book:  { position: [-2.6, 0.7, -1.2], scale: 0.7,  opacity: 0.28 },
    clock: { position: [2.4, 0.5, -0.8],  scale: 0.7,  opacity: 0.28 },
    coin:  { position: [0, 0, 0.5],        scale: 1.3,  opacity: 1   },
    gem:   { position: [2.2, -1.0, -0.6], scale: 0.7,  opacity: 0.28 },
  },
  community: {
    book:  { position: [-2.4, 0.7, -1.0], scale: 0.7,  opacity: 0.28 },
    clock: { position: [2.2, 0.5, -0.8],  scale: 0.7,  opacity: 0.28 },
    coin:  { position: [-2.2, -1.0, -0.6],scale: 0.7,  opacity: 0.28 },
    gem:   { position: [0, 0, 0.5],        scale: 1.3,  opacity: 1   },
  },
  cta: {
    book:  { position: [-1.0, 0.9, 0],    scale: 0.9,  opacity: 1 },
    clock: { position: [1.0, 0.9, 0],     scale: 0.9,  opacity: 1 },
    coin:  { position: [-1.0, -0.9, 0],   scale: 0.9,  opacity: 1 },
    gem:   { position: [1.0, -0.9, 0],    scale: 0.9,  opacity: 1 },
  },
}

/* ── Inner scene ─────────────────────────────────────── */
function SceneObjects() {
  const activeSection = useLandingStore((s) => s.activeSection)
  const reducedMotion = useLandingStore((s) => s.reducedMotion)
  const t = TARGETS[activeSection]

  return (
    <>
      {/* Warm desk-lamp key light */}
      <pointLight position={[5, 8, 4]} intensity={1.8} color="#FFD580" />
      {/* Cool fill */}
      <directionalLight position={[-4, 3, 2]} intensity={0.25} color="#B8D4E8" />
      {/* Near-zero ambient */}
      <ambientLight intensity={0.08} color="#1C1A16" />

      <BookObject  target={t.book}  reduced={reducedMotion} />
      <ClockObject target={t.clock} reduced={reducedMotion} />
      <CoinObject  target={t.coin}  reduced={reducedMotion} />
      <GemObject   target={t.gem}   reduced={reducedMotion} />
    </>
  )
}

/* ── Canvas — exported as dynamic() target ───────────── */
export default function Scene() {
  const setReducedMotion = useLandingStore((s) => s.setReducedMotion)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [setReducedMotion])

  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <SceneObjects />
    </Canvas>
  )
}
