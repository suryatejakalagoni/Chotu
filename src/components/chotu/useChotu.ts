'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import type { OwlMood } from './ChotuOwl'

export interface ChotuActions {
  hopTo: (perchKey: string, opts?: { mood?: OwlMood; moodMs?: number; say?: string; sayMs?: number }) => void
  say: (text: string, ms?: number) => void
  flashMood: (m: OwlMood, ms?: number) => void
  celebrate: (text?: string) => void
  listen: () => void
  stopListen: () => void
  react: (m: OwlMood, text?: string) => void
}

export interface ChotuState {
  pos: { left: number; top: number }
  mood: OwlMood
  look: { x: number; y: number }
  speech: string | null
  speechSide: 'top' | 'below'
  hopping: boolean
  extraClass: string
  talking: boolean
  onChotuClick: (e: React.MouseEvent) => void
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  actions: ChotuActions
}

const RANDOM_THOUGHTS = [
  'psst… anything due?', 'I am Chotu.', 'hi friends', '64 of us, one app',
  'scroll, scroll, scroll', 'hooo hoo', 'I see you', 'watching the rupees',
  'study time?', "let's split it", 'tap me!', "what's new?",
  'drag me if you like', 'all settled, peaceful', 'I live here now',
]

const GREETINGS = ['hey K!', 'hi friend', 'hoo hoo!', 'good to see you', 'back again?']

function homePos() {
  if (typeof window === 'undefined') return { left: 100, top: 100 }
  return {
    left: Math.max(8, window.innerWidth - 130),
    top: Math.max(8, window.innerHeight - 150),
  }
}

export function useChotu(): ChotuState {
  const [pos, setPos] = useState({ left: 100, top: 100 })
  const [mood, setMood] = useState<OwlMood>('normal')
  const [look, setLook] = useState({ x: 0, y: 0 })
  const [speech, setSpeech] = useState<string | null>(null)
  const [speechSide] = useState<'top' | 'below'>('top')
  const [hopping, setHopping] = useState(false)
  const [extraClass, setExtraClass] = useState('')
  const [perch, setPerch] = useState<string | null>(null)
  const [talking, setTalking] = useState(false)

  const idleSinceRef = useRef(Date.now())
  const dragRef = useRef({ active: false, offX: 0, offY: 0, moved: false, startX: 0, startY: 0 })
  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const talkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const moodRef = useRef<OwlMood>('normal')

  // Keep moodRef in sync so closures can read current mood without stale closure
  useEffect(() => { moodRef.current = mood }, [mood])

  const say = useCallback((text: string, ms = 2600) => {
    setSpeech(text)
    setTalking(true)
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current)
    if (talkingTimerRef.current) clearTimeout(talkingTimerRef.current)
    talkingTimerRef.current = setTimeout(() => setTalking(false), Math.min(ms, 900))
    speechTimerRef.current = setTimeout(() => setSpeech(null), ms)
  }, [])

  const flashMood = useCallback((m: OwlMood, ms = 1800) => {
    setMood(m)
    if (moodTimerRef.current) clearTimeout(moodTimerRef.current)
    moodTimerRef.current = setTimeout(() => setMood('normal'), ms)
  }, [])

  const hopTo = useCallback((_perchKey: string, opts: { mood?: OwlMood; moodMs?: number; say?: string; sayMs?: number } = {}) => {
    setPos(homePos())
    setPerch('home')
    setHopping(true)
    setTimeout(() => setHopping(false), 800)
    if (opts.mood) flashMood(opts.mood, opts.moodMs ?? 1800)
    if (opts.say) say(opts.say, opts.sayMs ?? 2200)
    idleSinceRef.current = Date.now()
  }, [flashMood, say])

  // Mount: settle to home corner + greeting
  useEffect(() => {
    setPos(homePos())
    const t = setTimeout(() => {
      flashMood('happy', 1800)
      say(GREETINGS[Math.floor(Math.random() * GREETINGS.length)], 2000)
    }, 600)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Cursor tracking
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const cx = pos.left + 55, cy = pos.top + 60
      const dx = e.clientX - cx, dy = e.clientY - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const norm = Math.min(1, dist / 220)
      setLook({ x: (dx / Math.max(dist, 1)) * norm, y: (dy / Math.max(dist, 1)) * norm })
      if (moodRef.current === 'sleep' && dist < 200) {
        flashMood('surprised', 800)
        setTimeout(() => setMood('normal'), 900)
      }
      idleSinceRef.current = Date.now()
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [pos, flashMood])

  // Blink loop
  useEffect(() => {
    let alive = true
    function blink() {
      if (!alive) return
      const m = moodRef.current
      if (m === 'normal' || m === 'happy') {
        setMood('wink')
        setTimeout(() => { if (alive) setMood(m) }, 140)
      }
      setTimeout(blink, 2400 + Math.random() * 4000)
    }
    const t = setTimeout(blink, 1500 + Math.random() * 2000)
    return () => { alive = false; clearTimeout(t) }
  }, [])

  // Idle sleep + random thoughts
  useEffect(() => {
    const t = setInterval(() => {
      const idle = Date.now() - idleSinceRef.current
      const m = moodRef.current
      if (idle > 25000 && m === 'normal') {
        setMood('sleep')
        say('zzz...', 2000)
      } else if (idle > 8000 && idle < 25000 && m === 'normal' && Math.random() < 0.18) {
        say(RANDOM_THOUGHTS[Math.floor(Math.random() * RANDOM_THOUGHTS.length)])
      }
    }, 3000)
    return () => clearInterval(t)
  }, [say])

  // Resize: snap back to home if perched
  useEffect(() => {
    function onResize() {
      if (perch === 'home') setPos(homePos())
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [perch])

  const onChotuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (dragRef.current.moved) { dragRef.current.moved = false; return }
    const rolls: OwlMood[] = ['happy', 'love', 'wink', 'surprised', 'shy']
    flashMood(rolls[Math.floor(Math.random() * rolls.length)], 1400)
    const lines = ['hoo!', 'hi!', 'tickles!', 'careful!', 'pet me again']
    say(lines[Math.floor(Math.random() * lines.length)], 1600)
    setExtraClass('shaking')
    setTimeout(() => setExtraClass(''), 400)
    idleSinceRef.current = Date.now()
  }, [flashMood, say])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { active: true, offX: e.clientX - pos.left, offY: e.clientY - pos.top, moved: false, startX: e.clientX, startY: e.clientY }
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    setExtraClass('dragging')
    setPerch(null)
  }, [pos])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true
    setPos({ left: e.clientX - dragRef.current.offX, top: e.clientY - dragRef.current.offY })
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    setExtraClass('')
    if (dragRef.current.moved) {
      flashMood('dizzy', 1000)
      say('whoa!', 1000)
      setTimeout(() => { idleSinceRef.current = Date.now() }, 1100)
    }
  }, [flashMood, say])

  const actions = useMemo<ChotuActions>(() => ({
    hopTo,
    say,
    flashMood,
    celebrate: (text?: string) => {
      flashMood('happy', 2000)
      say(text ?? 'nice!', 2000)
      setExtraClass('dance')
      setTimeout(() => setExtraClass(''), 1600)
    },
    listen: () => {
      flashMood('listening', 9999)
      say('I am listening…', 2000)
    },
    stopListen: () => {
      setMood('normal')
      say('got it', 1400)
    },
    react: (m: OwlMood, text?: string) => {
      flashMood(m, 1800)
      if (text) say(text, 1800)
    },
  }), [hopTo, say, flashMood])

  return { pos, mood, look, speech, speechSide, hopping, extraClass, talking, onChotuClick, onPointerDown, onPointerMove, onPointerUp, actions }
}
