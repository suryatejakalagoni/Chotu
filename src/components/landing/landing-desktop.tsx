'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef, useEffect } from 'react'
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useMotionValueEvent,
  type MotionValue,
} from 'framer-motion'
import { useLandingStore, type LandingSection } from '@/store/landing-store'
import CustomCursor from './cursor'

// ── Palette ──────────────────────────────────────────────────────
const BG     = '#0A1A10'
const CREAM  = '#F5F0E8'
const GOLD   = '#C9A961'
const DIM    = 'rgba(245,240,232,0.45)'
const FAINT  = 'rgba(245,240,232,0.22)'
const CARD   = 'rgba(245,240,232,0.055)'
const BORDER = 'rgba(245,240,232,0.08)'

// ── Fonts ─────────────────────────────────────────────────────────
const FF = "var(--font-fraunces,'Georgia',serif)"
const FM = "var(--font-dm-mono,'Courier New',monospace)"

// ── Scroll ranges [enter-start, enter-end, exit-start, exit-end] ──
const R = {
  hero:        [0,    0.02, 0.08, 0.14] as const,
  transition:  [0.10, 0.14, 0.18, 0.22] as const,
  assignments: [0.18, 0.22, 0.32, 0.38] as const,
  exams:       [0.34, 0.38, 0.48, 0.54] as const,
  expenses:    [0.50, 0.54, 0.61, 0.67] as const,
  voice:       [0.63, 0.67, 0.74, 0.80] as const,
  community:   [0.76, 0.80, 0.86, 0.92] as const,
  closer:      [0.88, 0.92, 1.00, 1.00] as const,
}

// ── Real photo per section ────────────────────────────────────────
// Drop your photos into public/landing/ — filenames below
const SECTION_IMAGE: Partial<Record<LandingSection, string>> = {
  hero:        '/landing/hero.jpg',
  assignments: '/landing/book.jpg',
  exams:       '/landing/notes.jpg',
  expenses:    '/landing/coins.jpg',
  voice:       '/landing/mic.jpg',
  community:   '/landing/students.jpg',
  closer:      '/landing/hero.jpg',
}

// ── Lenis smooth scroll ───────────────────────────────────────────
function useLenis() {
  useEffect(() => {
    let lenis: import('lenis').default | null = null
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return
    import('lenis').then(({ default: Lenis }) => {
      lenis = new Lenis({
        duration: 1.4,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      })
      function raf(time: number) {
        lenis?.raf(time)
        requestAnimationFrame(raf)
      }
      requestAnimationFrame(raf)
    })
    return () => { lenis?.destroy() }
  }, [])
}

// ── Text panel — absolutely positioned in the sticky viewport ─────
function TextPanel({
  children,
  sv,
  section,
}: {
  children: React.ReactNode
  sv: MotionValue<number>
  section: keyof typeof R
}) {
  const [es, ee, xs, xe] = R[section]
  const opacity = useTransform(sv, [es, ee, xs, xe], [0, 1, 1, 0])
  const y = useTransform(sv, [xs, xe], ['0px', '-28px'])

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '52%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 3rem 0 5vw',
        opacity,
        y,
      }}
    >
      {children}
    </motion.div>
  )
}

// ── DataCard ─────────────────────────────────────────────────────
type DataRow = { label: string; value: string; accent?: 'gold' | 'dim' }

function DataCard({
  rows,
  monoLabels = false,
}: {
  rows: DataRow[]
  monoLabels?: boolean
}) {
  return (
    <div
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: '0.625rem',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.55rem',
        maxWidth: '38ch',
      }}
    >
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1.5rem',
            fontFamily: FM,
            fontSize: '0.75rem',
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: monoLabels ? DIM : 'rgba(245,240,232,0.55)', flexShrink: 0 }}>
            {row.label}
          </span>
          <span
            style={{
              color:
                row.accent === 'gold' ? GOLD
                : row.accent === 'dim' ? FAINT
                : CREAM,
              textAlign: 'right',
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Pillar text block ─────────────────────────────────────────────
function PillarContent({
  tag,
  heading,
  body,
  rows,
  monoLabels = false,
}: {
  tag: string
  heading: string
  body: string
  rows: DataRow[]
  monoLabels?: boolean
}) {
  return (
    <>
      <span
        style={{
          display: 'block',
          fontFamily: FM,
          fontSize: '0.6875rem',
          letterSpacing: '0.18em',
          color: DIM,
          textTransform: 'uppercase',
          marginBottom: '1.125rem',
        }}
      >
        {tag}
      </span>
      <h2
        style={{
          fontFamily: FF,
          fontSize: 'clamp(2.25rem,3.5vw,3.25rem)',
          fontWeight: 700,
          lineHeight: 1.08,
          letterSpacing: '-0.03em',
          color: CREAM,
          margin: '0 0 1.125rem',
          maxWidth: '18ch',
        }}
      >
        {heading}
      </h2>
      <p
        style={{
          fontSize: '1rem',
          lineHeight: 1.68,
          color: DIM,
          maxWidth: '38ch',
          marginBottom: '1.75rem',
        }}
      >
        {body}
      </p>
      <DataCard rows={rows} monoLabels={monoLabels} />
    </>
  )
}

// ── Floating real-photo object ────────────────────────────────────
function FloatingImage() {
  const activeSection = useLandingStore((s) => s.activeSection)
  const src = SECTION_IMAGE[activeSection]

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        right: '5vw',
        top: '50%',
        transform: 'translateY(-50%)',
        width:  'clamp(260px, 36vh, 440px)',
        height: 'clamp(300px, 46vh, 560px)',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      <AnimatePresence mode="wait">
        {src && (
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: -28, scale: 0.96 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            style={{ position: 'relative', width: '100%', height: '100%' }}
          >
            {/* Inner div carries the CSS float so it doesn't fight Framer Y */}
            <div
              className="lc-obj-float"
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                filter:
                  'drop-shadow(0 40px 80px rgba(0,0,0,0.55)) drop-shadow(0 0 56px rgba(201,169,97,0.12))',
              }}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 1400px) 36vh, 440px"
                style={{ objectFit: 'contain' }}
                priority={activeSection === 'hero'}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────
function Nav({ sv }: { sv: MotionValue<number> }) {
  const opacity = useTransform(sv, [0, 0.02], [0, 1])
  return (
    <motion.nav
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem 5vw',
        opacity,
      }}
    >
      <span
        style={{
          fontFamily: FF,
          fontWeight: 900,
          fontSize: '1.1875rem',
          letterSpacing: '-0.03em',
          color: CREAM,
        }}
      >
        CHOTU
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <Link
          href="/login"
          data-magnetic
          style={{
            color: CREAM,
            opacity: 0.55,
            fontSize: '0.875rem',
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
        >
          Log in
        </Link>
        <Link
          href="/signup"
          data-magnetic
          style={{
            background: GOLD,
            color: BG,
            padding: '0.5rem 1.25rem',
            borderRadius: '100px',
            fontSize: '0.875rem',
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          Sign up
        </Link>
      </div>
    </motion.nav>
  )
}

// ── Rich atmospheric background ───────────────────────────────────
const RICH_BG = `
  radial-gradient(ellipse 65% 55% at 78% 28%, rgba(201,169,97,0.16) 0%, transparent 62%),
  radial-gradient(ellipse 75% 65% at 18% 82%, rgba(6,24,12,0.80)    0%, transparent 68%),
  radial-gradient(ellipse 55% 60% at 52% 100%,rgba(14,42,20,0.55)   0%, transparent 55%),
  radial-gradient(ellipse 40% 40% at 88% 72%, rgba(201,169,97,0.06)  0%, transparent 50%),
  ${BG}
`.trim()

// ── Main ──────────────────────────────────────────────────────────
export default function LandingDesktop() {
  useLenis()

  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress: sv } = useScroll({ target: containerRef })

  const setScrollProgress = useLandingStore((s) => s.setScrollProgress)
  const setReducedMotion  = useLandingStore((s) => s.setReducedMotion)

  // Sync scrollYProgress → store (drives FloatingImage section state)
  useMotionValueEvent(sv, 'change', setScrollProgress)

  // Detect reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [setReducedMotion])

  return (
    // Outer: tall scroll container — 600vh of scroll room
    <div
      ref={containerRef}
      className="landing-page"
      style={{ height: '600vh', position: 'relative' }}
    >
      <CustomCursor />

      {/* Inner: sticky viewport — never leaves screen */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100svh',
          overflow: 'hidden',
          background: RICH_BG,
        }}
      >
        {/* ── Nav ─────────────────────────────────────── */}
        <Nav sv={sv} />

        {/* ── Real photo — right side ─────────────────── */}
        <FloatingImage />

        {/* ── HERO ────────────────────────────────────── */}
        <TextPanel sv={sv} section="hero">
          {/* Gold glow behind hero text */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '30%',
              left: '25%',
              width: '60vh',
              height: '60vh',
              background:
                'radial-gradient(circle,rgba(201,169,97,0.07) 0%,transparent 65%)',
              pointerEvents: 'none',
              transform: 'translate(-50%,-50%)',
            }}
          />
          <h1
            style={{
              fontFamily: FF,
              fontSize: 'clamp(4.5rem,7vw,7rem)',
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: '-0.045em',
              color: CREAM,
              margin: 0,
            }}
          >
            CHOTU
          </h1>
          <p
            style={{
              fontFamily: FF,
              fontSize: 'clamp(1.25rem,1.8vw,1.625rem)',
              fontWeight: 300,
              lineHeight: 1.3,
              letterSpacing: '-0.01em',
              color: DIM,
              marginTop: '1.5rem',
              maxWidth: '28ch',
            }}
          >
            Made for the student who refuses to lose track.
          </p>
          {/* Scroll cue */}
          <div aria-hidden style={{ marginTop: '3rem' }}>
            <div
              className="lc-scroll-cue"
              style={{
                width: 1,
                height: 56,
                background:
                  'linear-gradient(to bottom,rgba(245,240,232,0.35),transparent)',
                marginLeft: 2,
              }}
            />
          </div>
        </TextPanel>

        {/* ── TRANSITION ─────────────────────────────── */}
        <TextPanel sv={sv} section="transition">
          <p
            style={{
              fontFamily: FF,
              fontSize: 'clamp(2rem,2.8vw,2.75rem)',
              fontWeight: 400,
              lineHeight: 1.2,
              letterSpacing: '-0.025em',
              color: CREAM,
              maxWidth: '22ch',
            }}
          >
            One place.
            <br />
            <span style={{ color: DIM }}>
              For every part of your academic life.
            </span>
          </p>
        </TextPanel>

        {/* ── ASSIGNMENTS ────────────────────────────── */}
        <TextPanel sv={sv} section="assignments">
          <PillarContent
            tag="Assignments"
            heading="Never miss a deadline."
            body="Log it. Track it. Set a reminder. Your assignments — due dates, subjects, notes, attachments — held exactly where you need them."
            rows={[
              { label: 'JAVA ASSIGNMENT', value: 'due in 3 days', accent: 'gold' },
              { label: 'PYTHON PROJECT',  value: 'submitted',     accent: 'dim'  },
              { label: 'C POINTERS LAB',  value: 'due tomorrow',  accent: 'gold' },
            ]}
          />
        </TextPanel>

        {/* ── EXAMS ──────────────────────────────────── */}
        <TextPanel sv={sv} section="exams">
          <PillarContent
            tag="Exams"
            heading="See the full picture."
            body="Map your topics. Mark what's revised. Chotu shows you the shape of what you know — and where the gaps are."
            rows={[
              { label: 'JAVA',   value: '████████░░  8 of 10' },
              { label: 'PYTHON', value: '████░░░░░░  4 of 10' },
              { label: 'C',      value: '██████████  READY',  accent: 'dim' },
            ]}
          />
        </TextPanel>

        {/* ── EXPENSES ───────────────────────────────── */}
        <TextPanel sv={sv} section="expenses">
          <PillarContent
            tag="Expenses"
            heading="The quiet math of paise."
            body="Log what you spend. Set a budget. Split costs with friends. Chotu does the arithmetic — you do everything else."
            rows={[
              { label: 'SPENT THIS MONTH', value: '₹4,200'                },
              { label: 'BUDGET REMAINING', value: '₹1,800',  accent: 'dim'  },
              { label: 'FOOD',             value: '₹1,450  ↑ 12%', accent: 'gold' },
            ]}
          />
        </TextPanel>

        {/* ── VOICE ──────────────────────────────────── */}
        <TextPanel sv={sv} section="voice">
          <PillarContent
            tag="Voice"
            heading="Speak it. Chotu logs it."
            body={`Say "spent 150 on food" and it's in expenses. Say "exam Friday at 10" and it's on your tracker. Your voice is an entry point for everything.`}
            monoLabels
            rows={[
              { label: '"spent 150 on books"',  value: '→ ₹150, Books & Study'         },
              { label: '"exam friday at 10am"', value: '→ Exams, Friday 10:00'          },
              { label: '"remind me at 8pm"',    value: '→ Reminder set', accent: 'dim'  },
            ]}
          />
        </TextPanel>

        {/* ── COMMUNITY ──────────────────────────────── */}
        <TextPanel sv={sv} section="community">
          <PillarContent
            tag="Community"
            heading="One signal at a time."
            body="Upload a note. Share a resource. Vote on what helped. Every student who uses Chotu adds to what every other student finds."
            rows={[
              { label: 'NOTES SHARED',    value: '1,247'                          },
              { label: 'TOP RESOURCE',    value: 'Java OOP Notes 2024'            },
              { label: 'ADDED THIS WEEK', value: '+34 resources', accent: 'dim'   },
            ]}
          />
        </TextPanel>

        {/* ── CLOSER ─────────────────────────────────── */}
        <TextPanel sv={sv} section="closer">
          <p
            style={{
              fontFamily: FF,
              fontSize: 'clamp(1.75rem,2.4vw,2.5rem)',
              fontWeight: 400,
              lineHeight: 1.22,
              letterSpacing: '-0.025em',
              color: CREAM,
              maxWidth: '22ch',
              marginBottom: '2.5rem',
            }}
          >
            CHOTU is for the student who takes their academic life seriously.
          </p>
          <Link
            href="/signup"
            data-magnetic
            style={{
              display: 'inline-block',
              background: GOLD,
              color: BG,
              fontWeight: 700,
              fontSize: '1rem',
              padding: '1rem 2.25rem',
              borderRadius: '100px',
              textDecoration: 'none',
              letterSpacing: '-0.015em',
              alignSelf: 'flex-start',
            }}
          >
            Start using Chotu.
          </Link>
          <p
            style={{
              marginTop: '1.25rem',
              fontSize: '0.8125rem',
              color: DIM,
              opacity: 0.65,
              lineHeight: 1.55,
            }}
          >
            No batch code required.
            <br />
            Sign up with your college email.
          </p>
        </TextPanel>

        {/* ── Keyboard-accessible skip link ─────────── */}
        <a
          href="/signup"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: 1,
            height: 1,
            overflow: 'hidden',
          }}
          onFocus={(e) => { e.currentTarget.style.left = '1rem' }}
          onBlur={(e) => { e.currentTarget.style.left = '-9999px' }}
        >
          Skip to sign up
        </a>
      </div>
    </div>
  )
}
