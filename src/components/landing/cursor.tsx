'use client'

import { useEffect, useRef } from 'react'

const TRAIL_COUNT = 3

export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null!)
  const ringRef = useRef<HTMLDivElement>(null!)
  const trailRefs = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    let rafId = 0
    const mouse = { x: -200, y: -200 }
    const ring = { x: -200, y: -200 }
    const trails: Array<{ x: number; y: number }> = Array.from({ length: TRAIL_COUNT }, () => ({
      x: -200,
      y: -200,
    }))
    const ringHistory: Array<{ x: number; y: number }> = []
    let frameCount = 0
    let magnetic: { cx: number; cy: number } | null = null

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX
      mouse.y = e.clientY

      // magnetic attraction
      const el = (e.target as HTMLElement)?.closest('[data-magnetic]') as HTMLElement | null
      if (el) {
        const r = el.getBoundingClientRect()
        magnetic = {
          cx: r.left + r.width / 2,
          cy: r.top + r.height / 2,
        }
      } else {
        magnetic = null
      }
    }

    const loop = () => {
      rafId = requestAnimationFrame(loop)
      frameCount++

      // Dot: instant
      dotRef.current.style.transform = `translate(${mouse.x - 2.5}px, ${mouse.y - 2.5}px)`

      // Ring: lerp toward mouse (or magnetic target)
      const targetX = magnetic ? mouse.x + (magnetic.cx - mouse.x) * 0.35 : mouse.x
      const targetY = magnetic ? mouse.y + (magnetic.cy - mouse.y) * 0.35 : mouse.y
      ring.x += (targetX - ring.x) * 0.12
      ring.y += (targetY - ring.y) * 0.12

      const isOnMagnetic = !!magnetic
      const ringSize = isOnMagnetic ? 44 : 22
      const ringHalf = ringSize / 2
      ringRef.current.style.transform = `translate(${ring.x - ringHalf}px, ${ring.y - ringHalf}px)`
      ringRef.current.style.width = `${ringSize}px`
      ringRef.current.style.height = `${ringSize}px`
      ringRef.current.style.backgroundColor = isOnMagnetic ? 'rgba(245,166,35,0.12)' : 'transparent'
      dotRef.current.style.opacity = isOnMagnetic ? '0' : '1'

      // Trail: sample ring position every 3rd frame
      if (frameCount % 3 === 0) {
        ringHistory.unshift({ x: ring.x, y: ring.y })
        if (ringHistory.length > TRAIL_COUNT * 3) ringHistory.pop()
      }

      trailRefs.current.forEach((el, i) => {
        const src = ringHistory[i * 3] ?? { x: ring.x, y: ring.y }
        const size = 8 - i * 1.5
        el.style.transform = `translate(${src.x - size / 2}px, ${src.y - size / 2}px)`
        el.style.width = `${size}px`
        el.style.height = `${size}px`
        const opacity = [0.18, 0.11, 0.06][i] ?? 0.04
        el.style.opacity = String(opacity)
      })

      trails.forEach((_, i) => {
        trails[i] = ringHistory[i] ?? { x: ring.x, y: ring.y }
      })
    }

    document.addEventListener('mousemove', onMouseMove, { passive: true })
    rafId = requestAnimationFrame(loop)

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <>
      {/* Dot */}
      <div
        ref={dotRef}
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 5,
          height: 5,
          borderRadius: '50%',
          backgroundColor: '#F5A623',
          pointerEvents: 'none',
          zIndex: 99999,
          willChange: 'transform',
          transition: 'opacity 0.15s',
        }}
      />
      {/* Ring */}
      <div
        ref={ringRef}
        aria-hidden
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          borderRadius: '50%',
          border: '1.5px solid rgba(245,166,35,0.5)',
          pointerEvents: 'none',
          zIndex: 99998,
          willChange: 'transform, width, height',
          transition: 'width 0.2s ease, height 0.2s ease, background-color 0.15s ease',
        }}
      />
      {/* Glow trail */}
      {Array.from({ length: TRAIL_COUNT }, (_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) trailRefs.current[i] = el
          }}
          aria-hidden
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            borderRadius: '50%',
            backgroundColor: '#F5A623',
            pointerEvents: 'none',
            zIndex: 99997 - i,
            willChange: 'transform',
          }}
        />
      ))}
    </>
  )
}
