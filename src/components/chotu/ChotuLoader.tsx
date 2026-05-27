'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ChotuOwl, type OwlMood } from './ChotuOwl'

// Mood sequence + matching captions
const FRAMES: { mood: OwlMood; caption: string }[] = [
  { mood: 'surprised', caption: 'Whoa, loading...'   },
  { mood: 'happy',     caption: 'Almost there!'       },
  { mood: 'wink',      caption: 'Hang tight...'       },
  { mood: 'dizzy',     caption: 'Working on it...'    },
  { mood: 'love',      caption: 'Coming right up!'    },
  { mood: 'sleepy',    caption: 'Fetching stuff...'   },
]
const INTERVAL = 1200 // ms per mood

interface ChotuLoaderProps {
  /** 'md' = full route-transition loader (centred in page area)
   *  'sm' = inline loader for in-page async states */
  size?: 'md' | 'sm'
  /** Override the cycling captions with a fixed string */
  label?: string
}

export function ChotuLoader({ size = 'md', label }: ChotuLoaderProps) {
  const [frame, setFrame] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const tween   = useRef<gsap.core.Tween | null>(null)
  const timer   = useRef<gsap.core.Tween | null>(null)

  // Gentle continuous bob via GSAP
  useEffect(() => {
    if (!wrapRef.current) return
    tween.current = gsap.to(wrapRef.current, {
      y: size === 'sm' ? -5 : -10,
      repeat: -1,
      yoyo: true,
      duration: size === 'sm' ? 0.45 : 0.55,
      ease: 'power1.inOut',
    })
    return () => { tween.current?.kill() }
  }, [size])

  // Cycle moods with GSAP delayedCall so it integrates with GSAP's ticker
  useEffect(() => {
    let idx = 0
    function next() {
      idx = (idx + 1) % FRAMES.length
      setFrame(idx)
      timer.current = gsap.delayedCall(INTERVAL / 1000, next)
    }
    timer.current = gsap.delayedCall(INTERVAL / 1000, next)
    return () => { timer.current?.kill() }
  }, [])

  const { mood, caption } = FRAMES[frame]
  const owlSize = size === 'sm' ? 60 : 100

  return (
    <div className={`chotu-loader${size === 'sm' ? ' chotu-loader--sm' : ''}`}>
      <div ref={wrapRef} className="chotu-loader__owl">
        <ChotuOwl mood={mood} size={owlSize} />
      </div>
      <p className="chotu-loader__caption">
        {label ?? caption}
      </p>
    </div>
  )
}
