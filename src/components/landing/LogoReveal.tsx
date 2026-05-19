'use client'

// Logo fades in from frame 1280, scales 0.8 → 1.0, centered in viewport.
// Shown during clip 7 (frames 1153–1344, top-down table view).

const FADE_START = 1280
const FADE_END = 1320

interface LogoRevealProps {
  currentFrame: number
}

export default function LogoReveal({ currentFrame }: LogoRevealProps) {
  if (currentFrame < FADE_START) return null

  const rawProgress = (currentFrame - FADE_START) / (FADE_END - FADE_START)
  const progress = Math.min(1, Math.max(0, rawProgress))
  const scale = 0.8 + 0.2 * progress

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-caveat, 'Kalam', cursive)",
          fontWeight: 700,
          fontSize: 'clamp(4rem, 12vw, 8rem)',
          letterSpacing: '-0.02em',
          color: '#F5E6D3',
          textShadow:
            '0 2px 24px rgba(201,169,97,0.45), 0 0 64px rgba(201,169,97,0.18)',
          opacity: progress,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'none',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        CHOTU
      </span>
    </div>
  )
}
