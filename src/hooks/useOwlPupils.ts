'use client'

import { useRef, useState, useEffect, type RefObject } from 'react'

/**
 * Tracks the mouse cursor and returns a bounded SVG-unit pupil offset.
 *
 * Works for any Owl instance — the auth owl and the landing owl both import
 * this so the logic lives in exactly one place.
 *
 * Owl viewBox: "-12 0 124 134".  Eye midpoint: (50, 66).
 * Pupils are capped at 5 SVG units so they never leave the white circles.
 *
 * @param active  Pass false while the covering state is active so pupils
 *                snap back to centre and the listener is removed.
 */
export function useOwlPupils(active: boolean): {
  svgRef: RefObject<SVGSVGElement | null>
  offset: { x: number; y: number }
} {
  const svgRef = useRef<SVGSVGElement>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!active) {
      setOffset({ x: 0, y: 0 })
      return
    }

    const onMove = (e: MouseEvent) => {
      const svg = svgRef.current
      if (!svg) return

      // Convert screen px → SVG user coordinates  (viewBox: x=-12, w=124, h=134)
      const r    = svg.getBoundingClientRect()
      const svgX = -12 + ((e.clientX - r.left) / r.width)  * 124
      const svgY =   0 + ((e.clientY - r.top)  / r.height) * 134

      const dx   = svgX - 50
      const dy   = svgY - 66
      const dist = Math.sqrt(dx * dx + dy * dy)
      const cap  = 5
      const s    = dist > 0 ? Math.min(dist, cap) / dist : 0

      setOffset({ x: dx * s, y: dy * s })
    }

    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [active])

  return { svgRef, offset }
}
