'use client'

import type { ReactNode } from 'react'
import { useState, useEffect } from 'react'
import SiteHeader from '@/components/site-header'
import Owl, { type OwlState } from '@/components/Owl'
import { OwlContext } from '@/components/auth/OwlContext'

export default function AuthSceneClient({ children }: { children: ReactNode }) {
  const [owlState,  setOwlState]  = useState<OwlState>('idle')
  // false until the fly-in animation ends — gates mouse tracking + focus states.
  const [isPerched, setIsPerched] = useState(false)

  useEffect(() => {
    // Reduced-motion: skip the drop, settle immediately so tracking is live at once.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsPerched(true)
    }
  }, [])

  return (
    <OwlContext.Provider value={{ owlState, setOwlState }}>
    <div
      style={{
        minHeight: '100svh',
        background: 'linear-gradient(180deg,#fff 0%,#fff 45%,#eceef1 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <SiteHeader />

      {/* Centred form column — z-index 1 keeps it above any future bg layers */}
      <div
        style={{
          minHeight: '100svh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '5.5rem 1rem 2.5rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ width: '100%', maxWidth: '440px' }}>

          {/* Wordmark — Clash Display, exact landing colour */}
          <div style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
            <span
              style={{
                fontFamily: "'Clash Display','Space Grotesk',sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(28px,5vw,38px)',
                letterSpacing: '.04em',
                color: '#16181d',
                lineHeight: 1,
                display: 'block',
              }}
            >
              CHOTU
            </span>
            <p
              style={{
                fontSize: '0.82rem',
                color: 'rgba(22,24,29,0.55)',
                fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
                margin: '0.3rem 0 0',
              }}
            >
              Your batch&apos;s command center
            </p>
          </div>

          {/*
           * Owl wrapper — position:relative so the owl's absolute coords
           * are anchored to this container, not the card.
           * The card itself has NO position:relative so backdrop-filter
           * cannot clip the owl (backdrop-filter creates an implicit
           * stacking context that clips overflow in Safari/WebKit).
           */}
          <div style={{ position: 'relative' }}>
            {/*
             * Frosted form card — position:relative intentionally removed
             * so the card's backdrop-filter does not clip the owl.
             */}
            <div
              style={{
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(18px) saturate(130%)',
                WebkitBackdropFilter: 'blur(18px) saturate(130%)',
                borderRadius: '20px',
                border: '1px solid rgba(0,0,0,0.08)',
                padding: '2rem',
                boxShadow:
                  '0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              {children}
            </div>

            {/* Owl peeks over the card's top-right corner — sibling of the
                card, so it is outside the backdrop-filter clipping context.
                Shown on both /signup and /login — OwlContext wires up state
                from whichever form is rendered as children.
                .owl-flyin class drives the entrance drop; once onAnimationEnd
                fires we remove the class and set isPerched=true to unlock
                mouse tracking and focus states. */}
            <div
              className={isPerched ? undefined : 'owl-flyin'}
              onAnimationEnd={(e) => {
                if (e.animationName === 'owl-flyin') setIsPerched(true)
              }}
              style={{
                position: 'absolute',
                top: '-108px',
                right: '0',
                width: '112px',
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              <Owl state={owlState} isPerched={isPerched} className="block w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
    </OwlContext.Provider>
  )
}
