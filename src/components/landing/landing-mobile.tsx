'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

// ── Palette ──────────────────────────────────────────────────────
const BG     = '#0A1A10'
const CREAM  = '#F5F0E8'
const GOLD   = '#C9A961'
const DIM    = 'rgba(245,240,232,0.45)'
const FAINT  = 'rgba(245,240,232,0.22)'
const CARD   = 'rgba(245,240,232,0.055)'
const BORDER = 'rgba(245,240,232,0.08)'

// ── Font variables (injected by layout.tsx onto <html>) ──────────
const FF = "var(--font-fraunces,'Georgia',serif)"
const FM = "var(--font-dm-mono,'Courier New',monospace)"

// ── Rich atmospheric background ───────────────────────────────────
const RICH_BG = `
  radial-gradient(ellipse 90% 50% at 80% 12%, rgba(201,169,97,0.14) 0%, transparent 60%),
  radial-gradient(ellipse 80% 60% at 10% 88%, rgba(6,24,12,0.80)    0%, transparent 65%),
  radial-gradient(ellipse 60% 45% at 50% 50%, rgba(14,42,20,0.40)   0%, transparent 55%),
  ${BG}
`.trim()

// ── Types ─────────────────────────────────────────────────────────
type DataRow = {
  label: string
  value: string
  accent?: 'gold' | 'dim'
}

// ── Safe photo — hides if the image 404s ─────────────────────────
function PillarPhoto({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 320,
        height: 260,
        margin: '0 auto 2rem',
      }}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="(max-width: 640px) 90vw, 320px"
        style={{ objectFit: 'contain' }}
        className="lc-obj-float"
        onError={() => setFailed(true)}
      />
    </div>
  )
}

// ── DataCard ─────────────────────────────────────────────────────
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
        borderRadius: '0.75rem',
        padding: '1.125rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
      }}
    >
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: '1rem',
            fontFamily: FM,
            fontSize: '0.75rem',
            lineHeight: 1.5,
          }}
        >
          <span
            style={{
              color: monoLabels ? DIM : 'rgba(245,240,232,0.55)',
              flexShrink: 0,
            }}
          >
            {row.label}
          </span>
          <span
            style={{
              color:
                row.accent === 'gold'
                  ? GOLD
                  : row.accent === 'dim'
                  ? FAINT
                  : CREAM,
              textAlign: 'right',
              wordBreak: 'break-word',
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Pillar section ────────────────────────────────────────────────
function Pillar({
  index,
  tag,
  heading,
  body,
  rows,
  monoLabels = false,
  image,
}: {
  index: string
  tag: string
  heading: string
  body: string
  rows: DataRow[]
  monoLabels?: boolean
  image?: string
}) {
  return (
    <section
      style={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '5rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ghost index watermark */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: '-0.05em',
          top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: FF,
          fontSize: 'clamp(8rem,42vw,18rem)',
          fontWeight: 900,
          color: 'rgba(245,240,232,0.025)',
          lineHeight: 1,
          pointerEvents: 'none',
          userSelect: 'none',
          letterSpacing: '-0.05em',
        }}
      >
        {index}
      </span>

      <span
        className="lm-reveal"
        style={{
          display: 'block',
          fontFamily: FM,
          fontSize: '0.6875rem',
          letterSpacing: '0.18em',
          color: DIM,
          textTransform: 'uppercase',
          marginBottom: '1.25rem',
        }}
      >
        {tag}
      </span>

      <h2
        className="lm-reveal"
        data-delay="80"
        style={{
          fontFamily: FF,
          fontSize: 'clamp(2rem,8vw,3rem)',
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          margin: '0 0 1.25rem',
          color: CREAM,
        }}
      >
        {heading}
      </h2>

      <p
        className="lm-reveal"
        data-delay="160"
        style={{
          fontSize: '1rem',
          lineHeight: 1.65,
          color: DIM,
          marginBottom: '2rem',
          maxWidth: '36ch',
        }}
      >
        {body}
      </p>

      {/* Real photo — shown when image prop provided */}
      {image && (
        <div className="lm-reveal" data-delay="200">
          <PillarPhoto src={image} />
        </div>
      )}

      <div className="lm-reveal" data-delay="240">
        <DataCard rows={rows} monoLabels={monoLabels} />
      </div>
    </section>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function LandingMobile() {
  const navRef = useRef<HTMLElement>(null)

  // Nav scroll effect — transparent → forest-blur
  useEffect(() => {
    const onScroll = () => {
      const nav = navRef.current
      if (!nav) return
      const scrolled = window.scrollY > 60
      nav.style.background = scrolled ? 'rgba(10,26,16,0.88)' : 'transparent'
      nav.style.backdropFilter = scrolled ? 'blur(14px)' : 'none'
      nav.style.borderBottom = scrolled
        ? `1px solid ${BORDER}`
        : '1px solid transparent'
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // IntersectionObserver — staggered reveals
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    if (prefersReduced) return

    const els = document.querySelectorAll<HTMLElement>('.lm-reveal')
    els.forEach((el) => {
      const d = el.getAttribute('data-delay')
      if (d) el.style.transitionDelay = `${d}ms`
    })

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('lm-visible')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div
      style={{
        background: RICH_BG,
        color: CREAM,
        minHeight: '100svh',
        overflowX: 'hidden',
      }}
    >
      {/* ── NAV ─────────────────────────────────────── */}
      <nav
        ref={navRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          transition:
            'background 0.4s ease, backdrop-filter 0.4s ease, border-bottom 0.4s ease',
          borderBottom: '1px solid transparent',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <Link
            href="/login"
            style={{
              color: CREAM,
              opacity: 0.6,
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            Log in
          </Link>
          <Link
            href="/signup"
            style={{
              background: GOLD,
              color: BG,
              padding: '0.4375rem 1.0625rem',
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
      </nav>

      {/* ── HERO ─────────────────────────────────────── */}
      <section
        style={{
          minHeight: '100svh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '6rem 1.5rem 4rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Hero photo — if provided */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: '-10%',
              top: '15%',
              width: '65%',
              height: '55%',
              opacity: 0.22,
            }}
          >
            <Image
              src="/landing/hero.jpg"
              alt=""
              fill
              sizes="60vw"
              style={{ objectFit: 'contain', objectPosition: 'right center' }}
              onError={() => {/* silently hide */}}
            />
          </div>
        </div>

        {/* Gold radial glow */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '38%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: '80vw',
            height: '80vw',
            background:
              'radial-gradient(circle,rgba(201,169,97,0.10) 0%,transparent 68%)',
            pointerEvents: 'none',
          }}
        />

        <h1
          style={{
            fontFamily: FF,
            fontSize: 'clamp(5rem,24vw,9rem)',
            fontWeight: 900,
            lineHeight: 0.88,
            letterSpacing: '-0.04em',
            margin: 0,
            color: CREAM,
            position: 'relative',
          }}
        >
          CHOTU
        </h1>

        <p
          style={{
            fontFamily: FF,
            fontSize: 'clamp(1.1875rem,4.5vw,1.625rem)',
            fontWeight: 300,
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
            color: DIM,
            marginTop: '1.75rem',
            maxWidth: '22ch',
            position: 'relative',
          }}
        >
          Made for the student who refuses to lose track.
        </p>

        {/* Scroll cue */}
        <div aria-hidden style={{ marginTop: '3.5rem', position: 'relative' }}>
          <div
            className="lc-scroll-cue"
            style={{
              width: 1,
              height: 52,
              background: `linear-gradient(to bottom,rgba(245,240,232,0.4),transparent)`,
              marginLeft: 2,
            }}
          />
        </div>
      </section>

      {/* ── TRANSITION ───────────────────────────────── */}
      <section
        style={{
          minHeight: '55svh',
          display: 'flex',
          alignItems: 'center',
          padding: '4rem 1.5rem',
        }}
      >
        <p
          className="lm-reveal"
          style={{
            fontFamily: FF,
            fontSize: 'clamp(1.875rem,6.5vw,2.625rem)',
            fontWeight: 400,
            lineHeight: 1.2,
            letterSpacing: '-0.025em',
            color: CREAM,
          }}
        >
          One place.
          <br />
          <span style={{ color: DIM }}>
            For every part of your academic life.
          </span>
        </p>
      </section>

      {/* ── PILLAR 01: ASSIGNMENTS ───────────────────── */}
      <Pillar
        index="01"
        tag="Assignments"
        heading="Never miss a deadline."
        body="Log it. Track it. Set a reminder. Your assignments — due dates, subjects, notes, attachments — held exactly where you need them."
        image="/landing/book.jpg"
        rows={[
          { label: 'JAVA ASSIGNMENT', value: 'due in 3 days', accent: 'gold' },
          { label: 'PYTHON PROJECT',  value: 'submitted',     accent: 'dim'  },
          { label: 'C POINTERS LAB',  value: 'due tomorrow',  accent: 'gold' },
        ]}
      />

      {/* ── PILLAR 02: EXAMS ─────────────────────────── */}
      <Pillar
        index="02"
        tag="Exams"
        heading="See the full picture."
        body="Map your topics. Mark what's revised. Chotu shows you the shape of what you know — and where the gaps are."
        image="/landing/notes.jpg"
        rows={[
          { label: 'JAVA',   value: '████████░░  8 of 10' },
          { label: 'PYTHON', value: '████░░░░░░  4 of 10' },
          { label: 'C',      value: '██████████  READY',  accent: 'dim' },
        ]}
      />

      {/* ── PILLAR 03: EXPENSES ──────────────────────── */}
      <Pillar
        index="03"
        tag="Expenses"
        heading="The quiet math of paise."
        body="Log what you spend. Set a budget. Split costs with friends. Chotu does the arithmetic — you do everything else."
        image="/landing/coins.jpg"
        rows={[
          { label: 'SPENT THIS MONTH', value: '₹4,200'          },
          { label: 'BUDGET REMAINING', value: '₹1,800',  accent: 'dim'  },
          { label: 'FOOD',             value: '₹1,450  ↑ 12%', accent: 'gold' },
        ]}
      />

      {/* ── PILLAR 04: VOICE ─────────────────────────── */}
      <Pillar
        index="04"
        tag="Voice"
        heading="Speak it. Chotu logs it."
        body={`Say "spent 150 on food" and it's in expenses. Say "exam Friday at 10" and it's on your tracker. Your voice is an entry point for everything.`}
        image="/landing/mic.jpg"
        monoLabels
        rows={[
          { label: '"spent 150 on books"',  value: '→ ₹150, Books & Study'  },
          { label: '"exam friday at 10am"', value: '→ Exams, Friday 10:00'  },
          { label: '"remind me at 8pm"',    value: '→ Reminder set', accent: 'dim' },
        ]}
      />

      {/* ── PILLAR 05: COMMUNITY ─────────────────────── */}
      <Pillar
        index="05"
        tag="Community"
        heading="One signal at a time."
        body="Upload a note. Share a resource. Vote on what helped. Every student who uses Chotu adds to what every other student finds."
        image="/landing/students.jpg"
        rows={[
          { label: 'NOTES SHARED',    value: '1,247'                  },
          { label: 'TOP RESOURCE',    value: 'Java OOP Notes 2024'    },
          { label: 'ADDED THIS WEEK', value: '+34 resources', accent: 'dim' },
        ]}
      />

      {/* ── CLOSER ───────────────────────────────────── */}
      <section
        style={{
          minHeight: '100svh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '4rem 1.5rem 6rem',
        }}
      >
        <p
          className="lm-reveal"
          style={{
            fontFamily: FF,
            fontSize: 'clamp(1.625rem,5.5vw,2.375rem)',
            fontWeight: 400,
            lineHeight: 1.22,
            letterSpacing: '-0.025em',
            marginBottom: '3rem',
            maxWidth: '20ch',
            color: CREAM,
          }}
        >
          CHOTU is for the student who takes their academic life seriously.
        </p>

        <Link
          href="/signup"
          className="lm-reveal"
          data-delay="120"
          style={{
            display: 'inline-block',
            background: GOLD,
            color: BG,
            fontWeight: 700,
            fontSize: '1.0625rem',
            padding: '1.0625rem 2.25rem',
            borderRadius: '100px',
            textDecoration: 'none',
            alignSelf: 'flex-start',
            letterSpacing: '-0.015em',
          }}
        >
          Start using Chotu.
        </Link>

        <p
          className="lm-reveal"
          data-delay="200"
          style={{
            marginTop: '1.5rem',
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
      </section>
    </div>
  )
}
