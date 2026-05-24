'use client'

import { useEffect, useRef, useMemo } from 'react'

interface GalaxyWipeProps {
  active: boolean
  originX: number
  originY: number
  onComplete: () => void
}

export function GalaxyWipe({ active, originX, originY, onComplete }: GalaxyWipeProps) {
  const circleRef    = useRef<HTMLDivElement>(null)
  const onCompleteRef = useRef(onComplete)

  // Keep the callback ref current so animationend always sees the latest fn.
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  // Star positions generated once — before the conditional return (rules of hooks).
  const stars = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        id: i,
        x: +(Math.random() * 92 + 4).toFixed(1),
        y: +(Math.random() * 92 + 4).toFixed(1),
      })),
    []
  )

  useEffect(() => {
    if (!active) return

    // Reduced-motion: skip entirely, call onComplete as a hard cut.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onCompleteRef.current()
      return
    }

    const el = circleRef.current
    if (!el) return

    // animationend bubbles in most browsers, so guard by animationName so
    // the child .gw-w-stars fade-in doesn't fire onComplete prematurely.
    const onEnd = (e: AnimationEvent) => {
      if (e.animationName !== 'gw-expand') return
      onCompleteRef.current()
    }

    el.addEventListener('animationend', onEnd)
    return () => el.removeEventListener('animationend', onEnd)
  }, [active])

  // No DOM when idle — unmounting resets the animation for the next activation.
  if (!active) return null

  return (
    <>
      <style jsx global>{`
        @keyframes gw-expand {
          from { transform: translate(-50%, -50%) scale(0);  }
          to   { transform: translate(-50%, -50%) scale(46); }
        }

        @keyframes gw-stars-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        /* ── Expanding circle ──────────────────────────────────────── */
        .gw-circle {
          position:        fixed;
          width:           100px;
          height:          100px;
          border-radius:   50%;
          /* Indigo-themed radial: bright core → near-black rim */
          background:      radial-gradient(
            circle,
            hsl(245 55% 28%) 0%,
            hsl(245 65% 10%) 55%,
            hsl(245 75% 4%)  100%
          );
          transform:       translate(-50%, -50%) scale(0);
          pointer-events:  none;
          z-index:         9999;
          animation:       gw-expand 750ms cubic-bezier(.6,.02,.3,1) forwards;
          will-change:     transform;
        }

        /* ── Stars container — fades in 150 ms after wipe starts ─── */
        .gw-w-stars {
          position:      absolute;
          inset:         0;
          border-radius: 50%;
          overflow:      hidden;
          animation:     gw-stars-in 300ms ease 150ms both;
        }

        /* ── Individual star dots — static, no per-star animation ── */
        .gw-dot {
          position:      absolute;
          width:         2px;
          height:        2px;
          border-radius: 50%;
          background:    #fff;
          transform:     translate(-50%, -50%);
        }

        /* ── Reduced-motion overrides ──────────────────────────────
         * Jump straight to the filled state; onComplete is called
         * synchronously in the useEffect so navigation fires instantly.
         */
        @media (prefers-reduced-motion: reduce) {
          .gw-circle  { animation: none; transform: translate(-50%, -50%) scale(46); }
          .gw-w-stars { animation: none; opacity: 1; }
        }
      `}</style>

      <div
        ref={circleRef}
        className="gw-circle"
        style={{ left: originX, top: originY }}
        aria-hidden="true"
      >
        <div className="gw-w-stars">
          {stars.map(s => (
            <div
              key={s.id}
              className="gw-dot"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            />
          ))}
        </div>
      </div>
    </>
  )
}
