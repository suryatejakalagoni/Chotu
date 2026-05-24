'use client'

import { useEffect, useRef } from 'react'

interface GalaxyButtonProps {
  label: string
  pending: boolean
  disabled?: boolean
  onClick?: () => void
  starCount?: number
  /** Explicit pending label override; if omitted, derived from label. */
  pendingLabel?: string
}

export function GalaxyButton({
  label,
  pending,
  disabled = false,
  onClick,
  starCount = 9,
  pendingLabel: pendingLabelProp,
}: GalaxyButtonProps) {
  const skyRef   = useRef<HTMLDivElement>(null)
  const sparkRef = useRef<HTMLDivElement>(null)

  const count        = Math.min(Math.max(starCount, 6), 12)
  const pendingLabel = pendingLabelProp ?? (label.includes('Sign') ? 'Signing in…' : 'Creating account…')
  const isDisabled   = disabled || pending

  // Append star elements scoped to this instance's sky div — never document-wide.
  useEffect(() => {
    const sky = skyRef.current
    if (!sky) return
    const stars: HTMLDivElement[] = []
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div')
      el.className = 'gx-star'
      el.style.left             = `${(Math.random() * 82 + 5).toFixed(1)}%`
      el.style.top              = `${(Math.random() * 72 + 8).toFixed(1)}%`
      el.style.animationDelay   = `${(Math.random() * 2.4).toFixed(2)}s`
      sky.appendChild(el)
      stars.push(el)
    }
    return () => stars.forEach(s => s.remove())
  }, [count])

  // Pause spark + star animations while the tab is hidden to save GPU.
  useEffect(() => {
    const onVisibility = () => {
      const state = document.hidden ? 'paused' : 'running'
      if (sparkRef.current) sparkRef.current.style.animationPlayState = state
      // Scoped querySelector — only touches stars inside THIS button's sky.
      skyRef.current
        ?.querySelectorAll<HTMLDivElement>('.gx-star')
        .forEach(s => { s.style.animationPlayState = state })
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return (
    <>
      {/*
       * @property enables CSS to interpolate --gx-a as an angle, which is what
       * makes the conic-gradient rotation work via a pure CSS animation.
       * `global` is required because @property and @keyframes are always global.
       */}
      <style jsx global>{`
        @property --gx-a {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes gx-spin {
          to { --gx-a: 360deg; }
        }

        @keyframes gx-twinkle {
          0%, 100% { opacity: 0.25; transform: scale(0.8); }
          50%       { opacity: 1;    transform: scale(1.3); }
        }

        /* ── Button shell ──────────────────────────────────────── */
        .gx-btn {
          position:        relative;
          width:           100%;
          max-width:       240px;
          height:          52px;
          border-radius:   12px;
          background:      hsl(245 60% 8%);
          border:          none;
          cursor:          pointer;
          overflow:        hidden;
          display:         flex;
          align-items:     center;
          justify-content: center;
          transition:      opacity 0.2s;
        }

        .gx-btn[data-dis='true'] {
          opacity:        0.6;
          cursor:         not-allowed;
          pointer-events: none;
        }

        /* ── Rotating conic border, masked to a 1.5 px ring ─────
         *
         * Technique: padding creates the ring width; two mask layers
         * (content-box + border-box) composited with XOR/exclude
         * reveal only the padding strip — the conic gradient shows
         * through as a coloured ring, not as a filled rectangle.
         */
        .gx-spark {
          position:      absolute;
          inset:         0;
          border-radius: 12px;
          padding:       1.5px;
          background:    conic-gradient(
            from var(--gx-a),
            transparent  0   60%,
            hsl(245 90% 70%) 75%,
            transparent  90% 100%
          );
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite:         exclude;
          animation:      gx-spin 3s linear infinite;
          pointer-events: none;
        }

        /* ── Star-field sky, inset 1.5 px so the spark ring shows ── */
        .gx-sky {
          position:      absolute;
          inset:         1.5px;
          border-radius: 11px;
          background:    radial-gradient(
            120% 140% at 30% 20%,
            hsl(245 55% 22%),
            hsl(245 70% 6%) 70%
          );
          overflow:       hidden;
          pointer-events: none;
        }

        /* ── Stars — generated in useEffect, appended to skyRef ── */
        .gx-star {
          position:      absolute;
          width:         2px;
          height:        2px;
          border-radius: 50%;
          background:    #fff;
          animation:     gx-twinkle 2.4s ease-in-out infinite;
        }

        /* ── Label ─────────────────────────────────────────────── */
        .gx-label {
          position:       relative;
          z-index:        10;
          color:          #fff;
          font-size:      16px;
          font-weight:    500;
          letter-spacing: 0.01em;
          pointer-events: none;
          user-select:    none;
        }

        /* ── Reduced-motion: kill both animations ──────────────── */
        @media (prefers-reduced-motion: reduce) {
          .gx-spark { animation: none !important; }
          .gx-star  { animation: none !important; }
        }
      `}</style>

      <button
        type="submit"
        disabled={isDisabled}
        data-dis={String(isDisabled)}
        aria-label={label}
        aria-busy={pending}
        onClick={onClick}
        className="gx-btn"
      >
        <div ref={sparkRef} className="gx-spark" aria-hidden="true" />
        <div ref={skyRef}   className="gx-sky"   aria-hidden="true" />
        <span className="gx-label">
          {pending ? pendingLabel : label}
        </span>
      </button>
    </>
  )
}
