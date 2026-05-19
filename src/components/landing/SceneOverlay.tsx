'use client'

import { useEffect, useState } from 'react'
import { SCENE_BEATS } from '@/lib/landing-scene'

// Frames over which the label fades in / fades out at each end of labelVisibleRange
const FADE_FRAMES = 30

interface SceneOverlayProps {
  currentFrame: number
}

function getLabelOpacity(
  labelVisibleRange: readonly [number, number],
  currentFrame: number,
): number {
  const [start, end] = labelVisibleRange
  // [0, 0] → beat has no label (anchor, logo)
  if (start === 0 && end === 0) return 0
  if (currentFrame < start || currentFrame > end) return 0

  const fadeInEnd = start + FADE_FRAMES
  const fadeOutStart = end - FADE_FRAMES

  if (currentFrame <= fadeInEnd) {
    return (currentFrame - start) / FADE_FRAMES
  }
  if (currentFrame >= fadeOutStart) {
    return (end - currentFrame) / FADE_FRAMES
  }
  return 1
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])
  return isMobile
}

export default function SceneOverlay({ currentFrame }: SceneOverlayProps) {
  const isMobile = useIsMobile()

  return (
    <>
      {SCENE_BEATS.map((beat) => {
        const opacity = getLabelOpacity(beat.labelVisibleRange, currentFrame)

        // Skip render entirely when invisible (avoids DOM node overhead)
        if (opacity <= 0) return null
        // Skip beats with no label text
        if (!beat.label) return null

        // Desktop: position from config — centre of label anchored at (x%, y%)
        const desktopPositionStyle: React.CSSProperties = {
          left: beat.labelPosition.x,
          top: beat.labelPosition.y,
          transform: `translate(-50%, -50%) rotate(${beat.labelPosition.rotation}deg)`,
          maxWidth: beat.labelPosition.maxWidth,
        }

        // Mobile (<768px): always bottom-centre regardless of per-scene config
        const mobilePositionStyle: React.CSSProperties = {
          left: '50%',
          bottom: '1.75rem',
          top: 'auto',
          transform: `translateX(-50%) rotate(${beat.labelPosition.rotation}deg)`,
          maxWidth: beat.labelPosition.maxWidth,
        }

        const positionStyle = isMobile ? mobilePositionStyle : desktopPositionStyle

        return (
          <div
            key={beat.id}
            style={{
              position: 'absolute',
              zIndex: 30,
              opacity,
              pointerEvents: 'none',
              ...positionStyle,
            }}
          >
            {/* Torn-paper note card */}
            <div
              style={{
                background:
                  'linear-gradient(135deg, #FEFAF3 0%, #F5EDDA 60%, #EFE5CC 100%)',
                borderRadius: '3px',
                padding: '0.625rem 0.875rem',
                boxShadow:
                  '0 4px 12px rgba(0,0,0,0.30), 0 1px 3px rgba(0,0,0,0.15)',
                outline: '1px solid rgba(180,150,100,0.18)',
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-caveat, 'Kalam', cursive)",
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  color: '#3D2B0F',
                  margin: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                {beat.label}
              </p>
              {beat.description && (
                <p
                  style={{
                    fontFamily: "var(--font-caveat, 'Kalam', cursive)",
                    fontSize: '0.875rem',
                    fontWeight: 400,
                    lineHeight: 1.3,
                    color: 'rgba(61,43,15,0.70)',
                    margin: '0.2rem 0 0',
                    whiteSpace: 'normal',
                  }}
                >
                  {beat.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
