'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SCENE_BEATS, TOTAL_DWELL_FRAMES, type SceneBeat } from '@/lib/landing-scene'
import SceneOverlay from './SceneOverlay'
import LogoReveal from './LogoReveal'

// ── Constants ─────────────────────────────────────────────────────
const PRELOAD_AHEAD = 50
const EVICT_BEHIND = 100
const MAX_CACHE = 150
const MIN_READY_FRAMES = 30

// Extra scroll height per dwell virtual-frame (vh units).
// Tune upward if dwell feels too short in browser; downward if page feels too long.
const DWELL_VH_MULTIPLIER = 0.5

// Base scroll spacer height (vh) before dwell extension.
const BASE_VH = 500

// Computed scroll spacer: base + extra from dwell zones
const SCROLL_HEIGHT_VH = BASE_VH + TOTAL_DWELL_FRAMES * DWELL_VH_MULTIPLIER

// ── Types ─────────────────────────────────────────────────────────
interface ManifestData {
  frameCount: number
  fps: number
  duration: number
  width: number
  height: number
  framePathPattern: string
}

interface LinearSegment {
  kind: 'linear'
  vStart: number
  vEnd: number
  fStart: number
  fEnd: number
}

interface DwellSegment {
  kind: 'dwell'
  vStart: number
  vEnd: number
  frame: number
}

type Segment = LinearSegment | DwellSegment

// ── Scroll-to-frame mapping ───────────────────────────────────────
//
// Builds a piecewise map: virtual scroll position → actual frame number.
// Between dwell zones the mapping is 1:1 (linear). At each peak with
// dwellRadius > 0, `dwellRadius * 2` extra virtual frames are inserted
// so the actual frame stays frozen while the user keeps scrolling.

function buildSegments(
  beats: readonly SceneBeat[],
  totalFrames: number,
): readonly Segment[] {
  const segments: Segment[] = []

  // Process peaks in frame order, skipping beats with no dwell
  const active = [...beats]
    .filter((b) => b.dwellRadius > 0)
    .sort((a, b) => a.peak - b.peak)

  let vCursor = 1 // virtual frame cursor
  let fCursor = 1 // actual frame cursor

  for (const beat of active) {
    const peakActual = beat.peak
    const dwellLen = beat.dwellRadius * 2

    // Linear run from current position up to this peak
    if (peakActual > fCursor) {
      const len = peakActual - fCursor
      segments.push({
        kind: 'linear',
        vStart: vCursor,
        vEnd: vCursor + len,
        fStart: fCursor,
        fEnd: peakActual,
      })
      vCursor += len
      fCursor = peakActual
    }

    // Dwell zone: virtual frames advance but actual frame stays at peak
    segments.push({
      kind: 'dwell',
      vStart: vCursor,
      vEnd: vCursor + dwellLen,
      frame: peakActual,
    })
    vCursor += dwellLen
    // fCursor stays at peakActual — we resume from there after the dwell
  }

  // Final linear run from last dwell to end of animation
  if (fCursor < totalFrames) {
    const len = totalFrames - fCursor
    segments.push({
      kind: 'linear',
      vStart: vCursor,
      vEnd: vCursor + len,
      fStart: fCursor,
      fEnd: totalFrames,
    })
  }

  return segments
}

// Map a virtual frame position (float) to an actual frame number (int).
function virtualToFrame(
  vFrame: number,
  segments: readonly Segment[],
): number {
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    // Use < for all but the last segment to avoid double-matching boundaries
    const isLast = i === segments.length - 1
    if (vFrame <= seg.vEnd || isLast) {
      if (seg.kind === 'dwell') return seg.frame
      const len = seg.vEnd - seg.vStart
      if (len === 0) return seg.fStart
      const t = Math.max(0, Math.min(1, (vFrame - seg.vStart) / len))
      return Math.max(
        seg.fStart,
        Math.min(seg.fEnd, Math.round(seg.fStart + t * (seg.fEnd - seg.fStart))),
      )
    }
  }
  return 1
}

// ── Pure helpers ──────────────────────────────────────────────────
function frameSrc(index: number): string {
  return `/landing/frames/frame-${String(index).padStart(4, '0')}.jpg`
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
): void {
  if (img.width === 0 || img.height === 0 || w === 0 || h === 0) return
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
}

// ── Component ─────────────────────────────────────────────────────
export default function ScrollScene() {
  // DOM refs
  const outerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Mutable state (refs — no re-render on change)
  const cacheRef = useRef<Map<number, HTMLImageElement>>(new Map())
  const pendingSet = useRef<Set<HTMLImageElement>>(new Set())
  const loadedCountRef = useRef(0)
  const mountedRef = useRef(true)
  const targetFrameRef = useRef(1)   // desired frame (set by ScrollTrigger)
  const paintedFrameRef = useRef(0)  // last frame drawn (0 = never)
  const rafIdRef = useRef<number>(0)

  // React state — drives re-renders only when needed
  const [manifest, setManifest] = useState<ManifestData | null>(null)
  const [manifestError, setManifestError] = useState(false)
  const [ready, setReady] = useState(false)
  const [currentFrame, setCurrentFrame] = useState(1) // feeds overlay components

  // ── Frame preloader ──────────────────────────────────────────────
  const preload = useCallback(
    (fromFrame: number, totalFrames: number): void => {
      if (!mountedRef.current) return
      const to = Math.min(fromFrame + PRELOAD_AHEAD, totalFrames)
      for (let i = fromFrame; i <= to; i++) {
        if (cacheRef.current.has(i)) continue
        const img = new window.Image() as HTMLImageElement
        pendingSet.current.add(img)
        img.onload = () => {
          pendingSet.current.delete(img)
          if (!mountedRef.current) return
          cacheRef.current.set(i, img)
          loadedCountRef.current++
          if (loadedCountRef.current >= MIN_READY_FRAMES) setReady(true)
          const evictBefore = paintedFrameRef.current - EVICT_BEHIND
          if (evictBefore > 1) {
            for (const [key] of cacheRef.current) {
              if (key < evictBefore) cacheRef.current.delete(key)
            }
          }
          if (cacheRef.current.size > MAX_CACHE) {
            const keys = Array.from(cacheRef.current.keys()).sort((a, b) => a - b)
            while (cacheRef.current.size > MAX_CACHE) {
              const k = keys.shift()
              if (k !== undefined) cacheRef.current.delete(k)
            }
          }
        }
        img.onerror = () => {
          pendingSet.current.delete(img)
        }
        img.src = frameSrc(i)
      }
    },
    [],
  )

  // ── 1. Manifest fetch ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    fetch('/landing/frames/MANIFEST.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<ManifestData>
      })
      .then((data) => {
        if (!cancelled) setManifest(data)
      })
      .catch(() => {
        if (!cancelled) setManifestError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // ── 2. Initial preload ───────────────────────────────────────────
  useEffect(() => {
    if (!manifest) return
    preload(1, manifest.frameCount)
  }, [manifest, preload])

  // ── 3. Canvas sizing via ResizeObserver ──────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const syncSize = () => {
      const w = Math.round(canvas.offsetWidth)
      const h = Math.round(canvas.offsetHeight)
      if (canvas.width === w && canvas.height === h) return
      canvas.width = w
      canvas.height = h
      const img = cacheRef.current.get(paintedFrameRef.current)
      const ctx = canvas.getContext('2d')
      if (img && ctx) drawCover(ctx, img, w, h)
    }

    syncSize()
    const ro = new ResizeObserver(syncSize)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])

  // ── 4. GSAP ScrollTrigger with non-linear frame mapping ──────────
  useEffect(() => {
    if (!manifest || !outerRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      targetFrameRef.current = 1
      return
    }

    gsap.registerPlugin(ScrollTrigger)

    const { frameCount } = manifest
    const totalVirtual = frameCount + TOTAL_DWELL_FRAMES
    const segments = buildSegments(SCENE_BEATS, frameCount)

    const st = ScrollTrigger.create({
      trigger: outerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      // scrub: 0.5 synchronises onUpdate to the rAF cycle, giving a slight
      // easing buffer that smooths out jitter without adding perceivable lag.
      scrub: 0.5,
      onUpdate: (self) => {
        const vFrame = 1 + self.progress * (totalVirtual - 1)
        targetFrameRef.current = virtualToFrame(vFrame, segments)
      },
    })

    return () => {
      st.kill()
    }
  }, [manifest])

  // ── 5. RAF paint loop ────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !manifest) return
    const { frameCount } = manifest
    const canvas = canvasRef.current
    if (!canvas) return

    function paint() {
      rafIdRef.current = requestAnimationFrame(paint)
      const target = targetFrameRef.current
      if (target === paintedFrameRef.current) return
      paintedFrameRef.current = target

      const img = cacheRef.current.get(target)
      const ctx = canvas ? canvas.getContext('2d') : null
      if (img && ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawCover(ctx, img, canvas.width, canvas.height)
      }

      setCurrentFrame(target)
      preload(target, frameCount)
    }

    rafIdRef.current = requestAnimationFrame(paint)
    return () => cancelAnimationFrame(rafIdRef.current)
  }, [ready, manifest, preload])

  // ── 6. Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    const pending = pendingSet.current
    const cache = cacheRef.current
    return () => {
      mountedRef.current = false
      cancelAnimationFrame(rafIdRef.current)
      for (const img of pending) {
        img.onload = null
        img.onerror = null
        img.src = ''
      }
      pending.clear()
      cache.clear()
    }
  }, [])

  // ── Error fallback ───────────────────────────────────────────────
  if (manifestError) {
    return (
      <div
        style={{
          height: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A1A10',
          color: 'rgba(245,240,232,0.6)',
          fontFamily: 'var(--font-geist-mono, monospace)',
          fontSize: '0.875rem',
        }}
      >
        Scene unavailable — please refresh.
      </div>
    )
  }

  return (
    // Outer: scroll spacer — height accounts for dwell zones
    <div
      ref={outerRef}
      style={{ height: `${SCROLL_HEIGHT_VH}vh`, position: 'relative' }}
    >
      {/* Inner: sticky viewport */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100svh',
          overflow: 'hidden',
          background: '#0A1A10',
        }}
      >
        {/* LCP image — shown while canvas preloads */}
        {!ready && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: 'scale(1.16)',
              transformOrigin: 'center center',
            }}
          >
            <Image
              src={frameSrc(1)}
              alt=""
              fill
              priority
              sizes="100vw"
              style={{ objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Canvas — scaled 1.16× to crop ~7% black bars */}
        <canvas
          ref={canvasRef}
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            transform: 'scale(1.16)',
            transformOrigin: 'center center',
            opacity: ready ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        />

        {/* Loading indicator */}
        {!ready && (
          <p
            role="status"
            style={{
              position: 'absolute',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              margin: 0,
              color: 'rgba(245,240,232,0.45)',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-geist-mono, monospace)',
              letterSpacing: '0.08em',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Loading scene…
          </p>
        )}

        {ready && <SceneOverlay currentFrame={currentFrame} />}
        {ready && <LogoReveal currentFrame={currentFrame} />}
      </div>
    </div>
  )
}
