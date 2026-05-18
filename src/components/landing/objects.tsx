'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group, MeshLambertMaterial, LineBasicMaterial } from 'three'

// ── Shared types ─────────────────────────────────────────────────
export interface ObjectTarget {
  position: [number, number, number]
  scale: number
  opacity: number
}

// Reuse across all objects to avoid allocations each frame
const _v = new THREE.Vector3()

// Lerp alphas — slow and weighted (Direction C "physical" motion)
const POS_A = 1.8   // position/scale: ~0.65s transition at 60fps
const OPA_A = 1.4   // opacity: slightly slower fade

// ── Book (Assignments) ───────────────────────────────────────────
// BoxGeometry pair — parchment fill, chalk edges
export function BookObject({
  target,
  reduced,
}: {
  target: ObjectTarget
  reduced: boolean
}) {
  const groupRef = useRef<Group>(null!)
  const fillRefs = useRef<(MeshLambertMaterial | null)[]>([null, null])
  const edgeRefs = useRef<(LineBasicMaterial | null)[]>([null, null])

  const bodyGeo   = useMemo(() => new THREE.BoxGeometry(1.2, 1.55, 0.13), [])
  const spineGeo  = useMemo(() => new THREE.BoxGeometry(0.13, 1.55, 0.13), [])
  const bodyEdges = useMemo(() => new THREE.EdgesGeometry(bodyGeo), [bodyGeo])
  const spineEdges= useMemo(() => new THREE.EdgesGeometry(spineGeo), [spineGeo])

  const targetRef = useRef(target)
  useEffect(() => { targetRef.current = target }, [target])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const t = targetRef.current
    const pa = Math.min(1, delta * POS_A)
    const oa = Math.min(1, delta * OPA_A)

    _v.set(...t.position)
    groupRef.current.position.lerp(_v, pa)
    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, t.scale, pa)
    groupRef.current.scale.setScalar(s)

    if (!reduced) groupRef.current.rotation.y += delta * 0.18

    fillRefs.current.forEach((m) => {
      if (m) m.opacity = THREE.MathUtils.lerp(m.opacity, t.opacity, oa)
    })
    edgeRefs.current.forEach((m) => {
      if (m) m.opacity = THREE.MathUtils.lerp(m.opacity, t.opacity * 0.8, oa)
    })
  })

  return (
    <group ref={groupRef} position={target.position}>
      {/* Body */}
      <mesh geometry={bodyGeo} position={[0.065, 0, 0]}>
        <meshLambertMaterial
          ref={(el) => { fillRefs.current[0] = el }}
          color="#E4DDD0"
          flatShading
          transparent
          opacity={target.opacity}
        />
      </mesh>
      <lineSegments geometry={bodyEdges} position={[0.065, 0, 0]}>
        <lineBasicMaterial
          ref={(el) => { edgeRefs.current[0] = el }}
          color="#F5F0E8"
          transparent
          opacity={target.opacity * 0.8}
        />
      </lineSegments>

      {/* Spine */}
      <mesh geometry={spineGeo} position={[-0.665, 0, 0]}>
        <meshLambertMaterial
          ref={(el) => { fillRefs.current[1] = el }}
          color="#D8D0C4"
          flatShading
          transparent
          opacity={target.opacity}
        />
      </mesh>
      <lineSegments geometry={spineEdges} position={[-0.665, 0, 0]}>
        <lineBasicMaterial
          ref={(el) => { edgeRefs.current[1] = el }}
          color="#F5F0E8"
          transparent
          opacity={target.opacity * 0.8}
        />
      </lineSegments>
    </group>
  )
}

// ── Icosahedron (Exams) ──────────────────────────────────────────
// 20-face solid — facets as "topics", tumbling all axes
export function IcosaObject({
  target,
  reduced,
}: {
  target: ObjectTarget
  reduced: boolean
}) {
  const groupRef = useRef<Group>(null!)
  const fillRef  = useRef<MeshLambertMaterial>(null!)
  const edgeRef  = useRef<LineBasicMaterial>(null!)

  const geo   = useMemo(() => new THREE.IcosahedronGeometry(0.88, 0), [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo])

  const targetRef = useRef(target)
  useEffect(() => { targetRef.current = target }, [target])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const t = targetRef.current
    const pa = Math.min(1, delta * POS_A)
    const oa = Math.min(1, delta * OPA_A)

    _v.set(...t.position)
    groupRef.current.position.lerp(_v, pa)
    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, t.scale, pa)
    groupRef.current.scale.setScalar(s)

    if (!reduced) {
      groupRef.current.rotation.x += delta * 0.12
      groupRef.current.rotation.y += delta * 0.19
      groupRef.current.rotation.z += delta * 0.07
    }

    if (fillRef.current)
      fillRef.current.opacity = THREE.MathUtils.lerp(fillRef.current.opacity, t.opacity, oa)
    if (edgeRef.current)
      edgeRef.current.opacity = THREE.MathUtils.lerp(edgeRef.current.opacity, t.opacity * 0.7, oa)
  })

  return (
    <group ref={groupRef} position={target.position}>
      <mesh geometry={geo}>
        <meshLambertMaterial
          ref={fillRef}
          color="#1C3329"
          flatShading
          transparent
          opacity={target.opacity}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial
          ref={edgeRef}
          color="#F5F0E8"
          transparent
          opacity={target.opacity * 0.7}
        />
      </lineSegments>
    </group>
  )
}

// ── Coins (Expenses) ─────────────────────────────────────────────
// 3 hexagonal cylinders — slowly drifting upward (accumulation)
// Top coin catches the focal light — gold glint on edges
export function CoinsObject({
  target,
  reduced,
}: {
  target: ObjectTarget
  reduced: boolean
}) {
  const groupRef = useRef<Group>(null!)
  const fillRefs = useRef<(MeshLambertMaterial | null)[]>([null, null, null])
  const edgeRefs = useRef<(LineBasicMaterial | null)[]>([null, null, null])

  const coinGeo   = useMemo(() => new THREE.CylinderGeometry(0.68, 0.68, 0.13, 6), [])
  const coinEdges = useMemo(() => new THREE.EdgesGeometry(coinGeo), [coinGeo])

  const stack = useMemo(
    () => [
      { y:  0.165, ry: 0,    edgeColor: '#C9A961' }, // top — gold
      { y:  0.015, ry: 0.52, edgeColor: '#A89070' }, // mid — muted
      { y: -0.135, ry: 1.04, edgeColor: '#7A6850' }, // bottom — darker
    ],
    []
  )

  const baseY   = useRef(0)
  const targetRef = useRef(target)
  useEffect(() => { targetRef.current = target }, [target])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const t = targetRef.current
    const pa = Math.min(1, delta * POS_A)
    const oa = Math.min(1, delta * OPA_A)

    _v.set(...t.position)
    groupRef.current.position.lerp(_v, pa)
    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, t.scale, pa)
    groupRef.current.scale.setScalar(s)

    // Slow upward drift when active (accumulation visual)
    if (!reduced && t.opacity > 0.5) {
      baseY.current += delta * 0.06
      if (baseY.current > 0.15) baseY.current = 0
    }

    if (!reduced) groupRef.current.rotation.y += delta * 0.12

    fillRefs.current.forEach((m) => {
      if (m) m.opacity = THREE.MathUtils.lerp(m.opacity, t.opacity, oa)
    })
    edgeRefs.current.forEach((m) => {
      if (m) m.opacity = THREE.MathUtils.lerp(m.opacity, t.opacity * 0.85, oa)
    })
  })

  return (
    <group ref={groupRef} position={target.position}>
      {stack.map(({ y, ry, edgeColor }, i) => (
        <group key={i} position={[0, y, 0]} rotation={[0, ry, 0]}>
          <mesh geometry={coinGeo}>
            <meshLambertMaterial
              ref={(el) => { fillRefs.current[i] = el }}
              color="#1C3329"
              flatShading
              transparent
              opacity={target.opacity}
            />
          </mesh>
          <lineSegments geometry={coinEdges}>
            <lineBasicMaterial
              ref={(el) => { edgeRefs.current[i] = el }}
              color={edgeColor}
              transparent
              opacity={target.opacity * 0.85}
            />
          </lineSegments>
        </group>
      ))}
    </group>
  )
}

// ── TorusKnot (Voice) ─────────────────────────────────────────────
// Thought becoming structure — sound frozen in geometry
export function VoiceObject({
  target,
  reduced,
}: {
  target: ObjectTarget
  reduced: boolean
}) {
  const groupRef = useRef<Group>(null!)
  const fillRef  = useRef<MeshLambertMaterial>(null!)
  const edgeRef  = useRef<LineBasicMaterial>(null!)

  const geo   = useMemo(() => new THREE.TorusKnotGeometry(0.52, 0.16, 80, 8), [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo])

  const targetRef = useRef(target)
  useEffect(() => { targetRef.current = target }, [target])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const t = targetRef.current
    const pa = Math.min(1, delta * POS_A)
    const oa = Math.min(1, delta * OPA_A)

    _v.set(...t.position)
    groupRef.current.position.lerp(_v, pa)
    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, t.scale, pa)
    groupRef.current.scale.setScalar(s)

    if (!reduced) {
      groupRef.current.rotation.y += delta * 0.14
      groupRef.current.rotation.z += delta * 0.09
    }

    if (fillRef.current)
      fillRef.current.opacity = THREE.MathUtils.lerp(fillRef.current.opacity, t.opacity, oa)
    if (edgeRef.current)
      edgeRef.current.opacity = THREE.MathUtils.lerp(edgeRef.current.opacity, t.opacity * 0.6, oa)
  })

  return (
    <group ref={groupRef} position={target.position}>
      <mesh geometry={geo}>
        <meshLambertMaterial
          ref={fillRef}
          color="#E8E2D8"
          flatShading
          transparent
          opacity={target.opacity}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial
          ref={edgeRef}
          color="#1C3329"
          transparent
          opacity={target.opacity * 0.6}
        />
      </lineSegments>
    </group>
  )
}

// ── Gem / Icosahedron-1 (Community) ──────────────────────────────
// Subdivided icosahedron — signals across distance
export function GemObject({
  target,
  reduced,
}: {
  target: ObjectTarget
  reduced: boolean
}) {
  const groupRef = useRef<Group>(null!)
  const fillRef  = useRef<MeshLambertMaterial>(null!)
  const edgeRef  = useRef<LineBasicMaterial>(null!)

  const geo   = useMemo(() => new THREE.IcosahedronGeometry(0.82, 1), [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo])

  const targetRef = useRef(target)
  useEffect(() => { targetRef.current = target }, [target])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const t = targetRef.current
    const pa = Math.min(1, delta * POS_A)
    const oa = Math.min(1, delta * OPA_A)

    _v.set(...t.position)
    groupRef.current.position.lerp(_v, pa)
    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, t.scale, pa)
    groupRef.current.scale.setScalar(s)

    if (!reduced) {
      groupRef.current.rotation.x += delta * 0.08
      groupRef.current.rotation.y += delta * 0.14
      groupRef.current.rotation.z += delta * 0.05
    }

    if (fillRef.current)
      fillRef.current.opacity = THREE.MathUtils.lerp(fillRef.current.opacity, t.opacity, oa)
    if (edgeRef.current)
      edgeRef.current.opacity = THREE.MathUtils.lerp(edgeRef.current.opacity, t.opacity * 0.65, oa)
  })

  return (
    <group ref={groupRef} position={target.position}>
      <mesh geometry={geo}>
        <meshLambertMaterial
          ref={fillRef}
          color="#12201A"
          flatShading
          transparent
          opacity={target.opacity}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial
          ref={edgeRef}
          color="#F5F0E8"
          transparent
          opacity={target.opacity * 0.65}
        />
      </lineSegments>
    </group>
  )
}
