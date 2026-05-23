'use client'

import { useEffect, useRef } from 'react'

interface Star {
  x: number; y: number
  vx: number; vy: number
  r: number
  phase: number; phaseSpeed: number
}

interface Props {
  pending: boolean
  label: string
  pendingLabel: string
}

export function GalaxyButton({ pending, label, pendingLabel }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  // Keep a ref so the animation loop reads the latest value without restarting
  const pendingRef = useRef(pending)
  useEffect(() => { pendingRef.current = pending }, [pending])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w   = canvas.clientWidth  || 320
    const h   = canvas.clientHeight || 42
    canvas.width  = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const stars: Star[] = Array.from({ length: 38 }, () => ({
      x:          Math.random() * w,
      y:          Math.random() * h,
      vx:         (Math.random() - 0.5) * 0.25,
      vy:         (Math.random() - 0.5) * 0.25,
      r:          Math.random() * 1.1 + 0.25,
      phase:      Math.random() * Math.PI * 2,
      phaseSpeed: 0.018 + Math.random() * 0.025,
    }))

    let raf = 0

    const tick = () => {
      ctx.clearRect(0, 0, w, h)

      // Purple nebula — left side
      const g1 = ctx.createRadialGradient(w * 0.25, h * 0.5, 0, w * 0.25, h * 0.5, w * 0.55)
      g1.addColorStop(0, 'rgba(88,28,135,0.22)')
      g1.addColorStop(1, 'transparent')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, w, h)

      // Blue nebula — right side
      const g2 = ctx.createRadialGradient(w * 0.82, h * 0.3, 0, w * 0.82, h * 0.3, w * 0.35)
      g2.addColorStop(0, 'rgba(37,99,235,0.14)')
      g2.addColorStop(1, 'transparent')
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, w, h)

      const speed = pendingRef.current ? 3 : 1

      for (const s of stars) {
        s.x     += s.vx * speed
        s.y     += s.vy * speed
        s.phase += s.phaseSpeed

        // Wrap around edges
        if (s.x < 0) s.x += w
        if (s.x > w) s.x -= w
        if (s.y < 0) s.y += h
        if (s.y > h) s.y -= h

        const alpha = Math.max(0, 0.35 + Math.sin(s.phase) * 0.45)
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }

    tick()
    return () => cancelAnimationFrame(raf)
  }, []) // init once — pendingRef handles live speed changes

  return (
    <button
      type="submit"
      disabled={pending}
      className="relative w-full rounded-lg py-2.5 text-sm font-bold tracking-wide overflow-hidden transition-opacity disabled:opacity-60"
      style={{ background: '#1a1a1a', color: '#fff' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />
      <span className="relative z-10 select-none">
        {pending ? pendingLabel : label}
      </span>
    </button>
  )
}
