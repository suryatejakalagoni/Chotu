'use client'

import { useOwlPupils } from '@/hooks/useOwlPupils'

export type OwlState = 'idle' | 'watching' | 'covering' | 'wink' | 'sympathetic'

export default function Owl({
  state = 'idle',
  className,
  isPerched = true,
}: {
  state?: OwlState
  className?: string
  /**
   * Pass false while the auth fly-in animation is running.
   * Keeps pupils centred (tracking disabled) and forces the idle look
   * (ears down, wings down) until the owl has landed.
   * Defaults to true so LandingOwl and other call-sites are unaffected.
   */
  isPerched?: boolean
}) {
  // Pupils only track the mouse once the owl has perched AND isn't covering.
  const { svgRef, offset: pupilOffset } = useOwlPupils(isPerched && state !== 'covering')

  // Force idle visuals during the drop — ears down, pupils centred, wings down.
  const effectiveState: OwlState = isPerched ? state : 'idle'
  const isWatching   = effectiveState === 'watching'
  const isCovering   = effectiveState === 'covering'
  const isWinking    = effectiveState === 'wink'
  const isSympathetic = effectiveState === 'sympathetic'

  return (
    <svg
      ref={svgRef}
      viewBox="-12 0 124 134"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="CHOTU owl mascot"
    >
      {/* body */}
      <ellipse cx="50" cy="78" rx="50" ry="54" fill="#D98A4E" stroke="#8B5E3C" strokeWidth="3" />

      {/* ear tufts — lift together on watching */}
      <g
        className="owl-ears"
        style={{
          transform:  isWatching ? 'translateY(-6px)' : 'translateY(0px)',
          transition: 'transform 0.3s ease-out',
        }}
      >
        <path d="M 8 36 Q 16 2 38 28 Z"  fill="#D98A4E" stroke="#8B5E3C" strokeWidth="3" />
        <path d="M 92 36 Q 84 2 62 28 Z" fill="#D98A4E" stroke="#8B5E3C" strokeWidth="3" />
      </g>

      {/* face disc */}
      <ellipse cx="50" cy="88" rx="33" ry="35" fill="#F5DEB8" />

      {/* eye whites — always fixed */}
      <circle cx="35" cy="66" r="16" fill="#fff" stroke="#8B5E3C" strokeWidth="2" />
      <circle cx="65" cy="66" r="16" fill="#fff" stroke="#8B5E3C" strokeWidth="2" />

      {/* sympathetic brows — \ / above each eye, inner corners high */}
      {isSympathetic && (
        <>
          <path d="M 38 51 L 22 57" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 62 51 L 78 57" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* pupils
          Outer <g> — translates for mouse tracking (no CSS transition; frame-rate smooth).
          Inner <g> — scales slightly on watching; fill-box anchors scale to pupil centre. */}
      <g style={{ transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)` }}>
        <g
          className="owl-pupils-scale"
          style={{
            transform:       isWatching ? 'scale(1.15)' : 'scale(1)',
            transformBox:    'fill-box',
            transformOrigin: '50% 50%',
            transition:      'transform 0.25s ease-out',
          }}
        >
          <circle cx="38" cy="69" r="8"   fill="#3a2a1a" />
          <circle cx="68" cy="69" r="8"   fill="#3a2a1a" />
          <circle cx="41" cy="66" r="2.6" fill="#fff" />
          <circle cx="71" cy="66" r="2.6" fill="#fff" />
        </g>
      </g>

      {/* wink overlay — paints face-disc colour over right eye + pupil, then draws eyelid arc */}
      {isWinking && (
        <>
          <circle cx="65" cy="66" r="16" fill="#F5DEB8" />
          <path d="M 49 66 Q 65 56 81 66" fill="none" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" />
        </>
      )}

      {/* beak */}
      <path d="M 44 82 L 50 90 L 56 82 Z" fill="#E8954F" stroke="#8B5E3C" strokeWidth="2" />

      {/* wings — closed paddle shapes
          Left pivot ≈ (9,84), tip ≈ (7,114) → rotate -120° → lands at (36,71) over left eye  ✓
          Right pivot ≈ (91,84), tip ≈ (93,114) → rotate +120° → lands at (64,71) over right eye ✓ */}
      <g
        className="owl-wing-left"
        style={{
          transform:       isCovering ? 'rotate(-120deg)' : 'rotate(0deg)',
          transformBox:    'fill-box',
          transformOrigin: '50% 0%',
          transition:      'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <path
          d="M 12 84 Q 2 90 0 102 Q -1 112 7 114 Q 15 116 17 106 Q 19 94 12 84 Z"
          fill="#D98A4E" stroke="#8B5E3C" strokeWidth="2.5"
        />
      </g>
      <g
        className="owl-wing-right"
        style={{
          transform:       isCovering ? 'rotate(120deg)' : 'rotate(0deg)',
          transformBox:    'fill-box',
          transformOrigin: '50% 0%',
          transition:      'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <path
          d="M 88 84 Q 98 90 100 102 Q 101 112 93 114 Q 85 116 83 106 Q 81 94 88 84 Z"
          fill="#D98A4E" stroke="#8B5E3C" strokeWidth="2.5"
        />
      </g>

      {/* belly feather hints */}
      <path d="M 38 116 Q 44 124 50 116" fill="none" stroke="#8B5E3C" strokeWidth="2" />
      <path d="M 50 116 Q 56 124 62 116" fill="none" stroke="#8B5E3C" strokeWidth="2" />
    </svg>
  )
}
