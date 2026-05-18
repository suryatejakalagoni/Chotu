'use client'

import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group, MeshLambertMaterial, LineBasicMaterial } from 'three'

const CHALK = '#F5F0E8'
const _tmp = new THREE.Vector3()

export interface ObjectTarget {
  position: [number, number, number]
  scale: number
  opacity: number
}

/* ── Book (Assignments) ───────────────────────────────── */
export function BookObject({
  target,
  reduced,
}: {
  target: ObjectTarget
  reduced: boolean
}) {
  const groupRef = useRef<Group>(null!)
  const fillARef = useRef<MeshLambertMaterial>(null!)
  const fillBRef = useRef<MeshLambertMaterial>(null!)
  const edgeARef = useRef<LineBasicMaterial>(null!)
  const edgeBRef = useRef<LineBasicMaterial>(null!)

  const bodyGeo = useMemo(() => new THREE.BoxGeometry(1.2, 1.6, 0.14), [])
  const spineGeo = useMemo(() => new THREE.BoxGeometry(0.14, 1.6, 0.14), [])
  const bodyEdges = useMemo(() => new THREE.EdgesGeometry(bodyGeo), [bodyGeo])
  const spineEdges = useMemo(() => new THREE.EdgesGeometry(spineGeo), [spineGeo])

  // Keep a stable ref to the current target to avoid closure stale-reads
  const targetRef = useRef(target)
  useEffect(() => { targetRef.current = target }, [target])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const t = targetRef.current
    const a = Math.min(1, delta * 4)

    _tmp.set(...t.position)
    groupRef.current.position.lerp(_tmp, a)
    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, t.scale, a)
    groupRef.current.scale.setScalar(s)

    if (!reduced) groupRef.current.rotation.y += delta * 0.3

    const mats = [fillARef, fillBRef, edgeARef, edgeBRef]
    for (const m of mats) {
      if (m.current) m.current.opacity = THREE.MathUtils.lerp(m.current.opacity, t.opacity, a)
    }
  })

  return (
    <group ref={groupRef} position={target.position}>
      <mesh geometry={bodyGeo} position={[0.07, 0, 0]}>
        <meshLambertMaterial ref={fillARef} color="#F5F0E8" flatShading transparent opacity={1} />
      </mesh>
      <lineSegments geometry={bodyEdges} position={[0.07, 0, 0]}>
        <lineBasicMaterial ref={edgeARef} color={CHALK} transparent opacity={0.75} />
      </lineSegments>

      <mesh geometry={spineGeo} position={[-0.67, 0, 0]}>
        <meshLambertMaterial ref={fillBRef} color="#EAE0D0" flatShading transparent opacity={1} />
      </mesh>
      <lineSegments geometry={spineEdges} position={[-0.67, 0, 0]}>
        <lineBasicMaterial ref={edgeBRef} color={CHALK} transparent opacity={0.75} />
      </lineSegments>
    </group>
  )
}

/* ── Clock (Exams) ────────────────────────────────────── */
export function ClockObject({
  target,
  reduced,
}: {
  target: ObjectTarget
  reduced: boolean
}) {
  const groupRef = useRef<Group>(null!)
  const fillRef = useRef<MeshLambertMaterial>(null!)
  const edgeRef = useRef<LineBasicMaterial>(null!)
  const handARef = useRef<MeshLambertMaterial>(null!)
  const handBRef = useRef<MeshLambertMaterial>(null!)

  const discGeo = useMemo(() => new THREE.CylinderGeometry(0.82, 0.82, 0.12, 8), [])
  const discEdges = useMemo(() => new THREE.EdgesGeometry(discGeo), [discGeo])
  const hourGeo = useMemo(() => new THREE.BoxGeometry(0.07, 0.52, 0.09), [])
  const minGeo = useMemo(() => new THREE.BoxGeometry(0.07, 0.36, 0.09), [])

  const targetRef = useRef(target)
  useEffect(() => { targetRef.current = target }, [target])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const t = targetRef.current
    const a = Math.min(1, delta * 4)

    _tmp.set(...t.position)
    groupRef.current.position.lerp(_tmp, a)
    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, t.scale, a)
    groupRef.current.scale.setScalar(s)

    if (!reduced) groupRef.current.rotation.z -= delta * 0.12

    const mats = [fillRef, edgeRef, handARef, handBRef]
    for (const m of mats) {
      if (m.current) m.current.opacity = THREE.MathUtils.lerp(m.current.opacity, t.opacity, a)
    }
  })

  return (
    <group ref={groupRef} position={target.position}>
      <mesh geometry={discGeo} rotation={[Math.PI / 2, 0, 0]}>
        <meshLambertMaterial ref={fillRef} color="#F5A623" flatShading transparent opacity={1} />
      </mesh>
      <lineSegments geometry={discEdges} rotation={[Math.PI / 2, 0, 0]}>
        <lineBasicMaterial ref={edgeRef} color={CHALK} transparent opacity={0.75} />
      </lineSegments>
      <mesh geometry={hourGeo} rotation={[0, 0, Math.PI / 6]} position={[-0.12, 0.18, 0.12]}>
        <meshLambertMaterial ref={handARef} color="#2C3531" flatShading transparent opacity={1} />
      </mesh>
      <mesh geometry={minGeo} rotation={[0, 0, -Math.PI / 3]} position={[0.1, 0.08, 0.12]}>
        <meshLambertMaterial ref={handBRef} color="#2C3531" flatShading transparent opacity={1} />
      </mesh>
    </group>
  )
}

/* ── Coin Stack (Expenses / Splits) ──────────────────── */
export function CoinObject({
  target,
  reduced,
}: {
  target: ObjectTarget
  reduced: boolean
}) {
  const groupRef = useRef<Group>(null!)
  const fillRefs = useRef<(MeshLambertMaterial | null)[]>([null, null, null])
  const edgeRefs = useRef<(LineBasicMaterial | null)[]>([null, null, null])

  const coinGeo = useMemo(() => new THREE.CylinderGeometry(0.7, 0.7, 0.13, 6), [])
  const coinEdges = useMemo(() => new THREE.EdgesGeometry(coinGeo), [coinGeo])

  const coins = useMemo(
    () => [{ y: 0.17, ry: 0 }, { y: 0.02, ry: 0.52 }, { y: -0.14, ry: 1.04 }],
    []
  )

  const targetRef = useRef(target)
  useEffect(() => { targetRef.current = target }, [target])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const t = targetRef.current
    const a = Math.min(1, delta * 4)

    _tmp.set(...t.position)
    groupRef.current.position.lerp(_tmp, a)
    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, t.scale, a)
    groupRef.current.scale.setScalar(s)

    if (!reduced) groupRef.current.rotation.y += delta * 0.25

    fillRefs.current.forEach((m) => {
      if (m) m.opacity = THREE.MathUtils.lerp(m.opacity, t.opacity, a)
    })
    edgeRefs.current.forEach((m) => {
      if (m) m.opacity = THREE.MathUtils.lerp(m.opacity, t.opacity, a)
    })
  })

  return (
    <group ref={groupRef} position={target.position}>
      {coins.map(({ y, ry }, i) => (
        <group key={i} position={[0, y, 0]} rotation={[0, ry, 0]}>
          <mesh geometry={coinGeo}>
            <meshLambertMaterial
              ref={(el) => { fillRefs.current[i] = el }}
              color="#2C3531"
              flatShading
              transparent
              opacity={1}
            />
          </mesh>
          <lineSegments geometry={coinEdges}>
            <lineBasicMaterial
              ref={(el) => { edgeRefs.current[i] = el }}
              color="#F5A623"
              transparent
              opacity={0.75}
            />
          </lineSegments>
        </group>
      ))}
    </group>
  )
}

/* ── Gem / Icosahedron (Community) ───────────────────── */
export function GemObject({
  target,
  reduced,
}: {
  target: ObjectTarget
  reduced: boolean
}) {
  const groupRef = useRef<Group>(null!)
  const fillRef = useRef<MeshLambertMaterial>(null!)
  const edgeRef = useRef<LineBasicMaterial>(null!)

  const gemGeo = useMemo(() => new THREE.IcosahedronGeometry(0.85, 0), [])
  const gemEdges = useMemo(() => new THREE.EdgesGeometry(gemGeo), [gemGeo])

  const targetRef = useRef(target)
  useEffect(() => { targetRef.current = target }, [target])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const t = targetRef.current
    const a = Math.min(1, delta * 4)

    _tmp.set(...t.position)
    groupRef.current.position.lerp(_tmp, a)
    const s = THREE.MathUtils.lerp(groupRef.current.scale.x, t.scale, a)
    groupRef.current.scale.setScalar(s)

    if (!reduced) {
      groupRef.current.rotation.x += delta * 0.15
      groupRef.current.rotation.y += delta * 0.22
      groupRef.current.rotation.z += delta * 0.08
    }

    if (fillRef.current) fillRef.current.opacity = THREE.MathUtils.lerp(fillRef.current.opacity, t.opacity, a)
    if (edgeRef.current) edgeRef.current.opacity = THREE.MathUtils.lerp(edgeRef.current.opacity, t.opacity, a)
  })

  return (
    <group ref={groupRef} position={target.position}>
      <mesh geometry={gemGeo}>
        <meshLambertMaterial ref={fillRef} color="#F5F5F0" flatShading transparent opacity={1} />
      </mesh>
      <lineSegments geometry={gemEdges}>
        <lineBasicMaterial ref={edgeRef} color="#2C3531" transparent opacity={0.75} />
      </lineSegments>
    </group>
  )
}
