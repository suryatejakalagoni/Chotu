'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })

/* ── CSS parallax shape — shifts on scroll ───────────── */
function ParallaxShape({
  clipPath,
  color,
  opacity,
  top,
  left,
  right,
  bottom,
  width,
  height,
  speed,
}: {
  clipPath: string
  color: string
  opacity: number
  top?: string
  left?: string
  right?: string
  bottom?: string
  width: string
  height: string
  speed: number
}) {
  const ref = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        if (!ref.current) { ticking = false; return }
        const parent = ref.current.closest('section') as HTMLElement | null
        if (!parent) { ticking = false; return }
        const rect = parent.getBoundingClientRect()
        const progress = -rect.top / window.innerHeight
        ref.current.style.transform = `translateY(${progress * speed * 60}px)`
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [speed])

  return (
    <div
      ref={ref}
      aria-hidden
      style={{
        position: 'absolute',
        top, left, right, bottom,
        width, height,
        clipPath,
        backgroundColor: color,
        opacity,
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    />
  )
}

/* ── Reveal on scroll ────────────────────────────────── */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null!)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const el = ref.current
    el.style.opacity = '0'
    el.style.transform = 'translateY(22px)'
    el.style.transition = `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
          obs.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [delay])

  return <div ref={ref}>{children}</div>
}

/* ── Mockup card ─────────────────────────────────────── */
function MockCard({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div
      style={{
        borderRadius: 12,
        padding: '18px',
        border: `1px solid ${dark ? '#222' : '#E8DFD0'}`,
        backgroundColor: dark ? '#141414' : '#FDFAF5',
      }}
    >
      {children}
    </div>
  )
}

export default function LandingMobile() {
  return (
    <div className={playfair.variable} style={{ cursor: 'auto' }}>

      {/* ── Nav ───────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', backgroundColor: '#0F0F0F',
          borderBottom: '1px solid #161616',
        }}
      >
        <span style={{ color: '#F5F5F0', fontWeight: 700, fontSize: 13, letterSpacing: '0.25em' }}>CHOTU</span>
        <Link href="/login" style={{ color: '#F5A623', fontSize: 13, fontWeight: 500 }}>Log in</Link>
      </nav>

      {/* ── Hero ──────────────────────────────────────── */}
      <section
        style={{
          position: 'relative', minHeight: '100svh', backgroundColor: '#0F0F0F',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '100px 24px 60px', overflow: 'hidden',
        }}
      >
        {/* Warm radial glow — simulates the desk lamp in 2D */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: [
              'radial-gradient(ellipse 75% 55% at 75% 28%, rgba(245,166,35,0.07) 0%, transparent 65%)',
              'radial-gradient(ellipse 50% 70% at 15% 85%, rgba(44,53,49,0.55) 0%, transparent 70%)',
            ].join(', '),
          }}
        />
        {/* Ghost watermark */}
        <span
          aria-hidden
          style={{
            position: 'absolute', right: '-4%', top: '50%',
            fontFamily: 'var(--font-playfair)', fontWeight: 700,
            fontSize: 'clamp(100px, 30vw, 180px)', color: '#2C3531', opacity: 0.06,
            transform: 'translateY(-50%) rotate(-12deg)', pointerEvents: 'none', userSelect: 'none',
          }}
        >
          CHOTU
        </span>
        {/* Saffron left rule */}
        <div style={{ position: 'absolute', left: 0, top: '25%', bottom: '25%', width: 2, backgroundColor: '#F5A623', opacity: 0.45 }} />

        <div style={{ position: 'relative', paddingLeft: 20 }}>
          <p style={{ color: '#3A3A3A', fontSize: 10, letterSpacing: '0.32em', textTransform: 'uppercase', marginBottom: 36, fontWeight: 500 }}>
            Built for college students · Telangana
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-playfair)', fontWeight: 700,
              fontSize: 'clamp(44px, 12vw, 72px)', color: '#F5F5F0',
              lineHeight: 1.02, marginBottom: 4,
            }}
          >
            Your batch&apos;s
          </h1>
          <h1
            style={{
              fontFamily: 'var(--font-playfair)', fontWeight: 700,
              fontSize: 'clamp(44px, 12vw, 72px)', color: '#F5F5F0',
              lineHeight: 1.02, marginBottom: 40,
            }}
          >
            command <span style={{ color: '#F5A623' }}>center.</span>
          </h1>
          <p style={{ color: '#3A3A3A', fontSize: 10, letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 36 }}>
            Assignments · Exams · Expenses · Splits · Community
          </p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              href="/signup"
              data-magnetic
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '14px 28px', backgroundColor: '#F5A623',
                color: '#0F0F0F', fontWeight: 600, fontSize: 13, letterSpacing: '0.06em',
              }}
            >
              Sign up free
            </Link>
            <Link href="/login" style={{ color: '#F5F5F0', fontSize: 13, fontWeight: 500 }}>
              Log in →
            </Link>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 24, right: 24, height: 1, backgroundColor: '#1C1C1C' }} />
      </section>

      {/* ── Feature 01 — Assignments & Exams ──────────── */}
      <section style={{ position: 'relative', backgroundColor: '#0F0F0F', padding: '80px 24px', overflow: 'hidden' }}>
        <ParallaxShape
          clipPath="polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)"
          color="#F5F0E8" opacity={0.05} top="10%" right="-5%" width="55%" height="60%" speed={0.3}
        />
        <span aria-hidden style={{
          position: 'absolute', right: 8, top: 8, fontFamily: 'var(--font-playfair)',
          fontSize: 'clamp(70px, 22vw, 140px)', color: '#2C3531', opacity: 0.07, fontWeight: 700,
          lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
        }}>01</span>

        <Reveal>
          <p style={{ color: '#F5A623', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 16 }}>Academics</p>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 'clamp(26px, 7vw, 40px)', color: '#F5F5F0', lineHeight: 1.15, marginBottom: 16 }}>
            Never miss a deadline.
          </h2>
          <p style={{ color: '#555', fontSize: 13, lineHeight: 1.8, marginBottom: 28, maxWidth: '38ch' }}>
            Track assignments by status, subject, and due date. Set reminders. Your exam schedule links automatically so nothing slips through.
          </p>
          <Link href="/signup" style={{ color: '#F5A623', fontSize: 13, fontWeight: 500 }}>Get started →</Link>
        </Reveal>

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { title: 'OS Assignment', subject: 'Operating Systems', due: 'Due tomorrow', status: 'In progress', pct: 65, accent: '#F5A623' },
            { title: 'DBMS Lab Report', subject: 'Database Systems', due: 'Due in 3 days', status: 'Not started', pct: 0, accent: '#444' },
            { title: 'CN Mini Project', subject: 'Computer Networks', due: 'Done', status: 'Done', pct: 100, accent: '#4ADE80' },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 60}>
              <MockCard dark>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p style={{ color: '#F5F5F0', fontSize: 13, fontWeight: 500 }}>{item.title}</p>
                    <p style={{ color: '#444', fontSize: 11, marginTop: 2 }}>{item.subject}</p>
                  </div>
                  <span style={{ backgroundColor: '#1C1C1C', color: item.accent, fontSize: 11, padding: '2px 8px', borderRadius: 4, marginLeft: 12, flexShrink: 0 }}>{item.status}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: '#222' }}>
                    <div style={{ width: `${item.pct}%`, height: 3, borderRadius: 2, backgroundColor: item.accent }} />
                  </div>
                  <p style={{ color: '#444', fontSize: 11, flexShrink: 0 }}>{item.due}</p>
                </div>
              </MockCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Feature 02 — Expenses & Splits ────────────── */}
      <section style={{ position: 'relative', backgroundColor: '#F5F0E8', padding: '80px 24px', overflow: 'hidden' }}>
        <ParallaxShape
          clipPath="polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
          color="#2C3531" opacity={0.07} top="5%" left="-10%" width="50%" height="55%" speed={-0.25}
        />
        <span aria-hidden style={{
          position: 'absolute', left: 8, top: 8, fontFamily: 'var(--font-playfair)',
          fontSize: 'clamp(70px, 22vw, 140px)', color: '#2C3531', opacity: 0.07, fontWeight: 700,
          lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
        }}>02</span>

        <Reveal>
          <p style={{ color: '#8B7355', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 16 }}>Money</p>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 'clamp(26px, 7vw, 40px)', color: '#2C3531', lineHeight: 1.15, marginBottom: 16 }}>
            Know where every rupee goes.
          </h2>
          <p style={{ color: '#8B7355', fontSize: 13, lineHeight: 1.8, marginBottom: 28, maxWidth: '38ch' }}>
            Set a monthly budget and track every expense against it. Split canteen bills by name — your friends don&apos;t need an account.
          </p>
          <Link href="/signup" style={{ color: '#2C3531', fontSize: 13, fontWeight: 500 }}>Get started →</Link>
        </Reveal>

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Reveal delay={60}>
            <MockCard>
              <p style={{ color: '#8B7355', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 10 }}>This month</p>
              <p style={{ fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 28, color: '#2C3531', lineHeight: 1, marginBottom: 4 }}>₹2,340</p>
              <p style={{ color: '#8B7355', fontSize: 11, marginBottom: 14 }}>spent · ₹5,000 budget</p>
              <div style={{ height: 6, borderRadius: 3, backgroundColor: '#E0D5C5', marginBottom: 12 }}>
                <div style={{ width: '47%', height: 6, borderRadius: 3, backgroundColor: '#2C3531' }} />
              </div>
              <div style={{ borderTop: '1px solid #E8DFD0', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[['Food', '₹840', '36%'], ['Transport', '₹420', '18%'], ['Books & Study', '₹680', '29%']].map(([l, a, p]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', color: '#8B7355', fontSize: 12 }}>
                    <span>{l}</span><span>{a} · {p}</span>
                  </div>
                ))}
              </div>
            </MockCard>
          </Reveal>
          <Reveal delay={120}>
            <MockCard>
              <p style={{ color: '#8B7355', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 10 }}>Pending splits</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8B7355' }}>
                  <span>Rahul owes you</span><span style={{ fontWeight: 600, color: '#2C3531' }}>₹350</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8B7355' }}>
                  <span>You owe Priya</span><span style={{ fontWeight: 600, color: '#C0392B' }}>₹175</span>
                </div>
              </div>
            </MockCard>
          </Reveal>
        </div>
      </section>

      {/* ── Feature 03 — Community Hub ────────────────── */}
      <section style={{ position: 'relative', backgroundColor: '#0F0F0F', padding: '80px 24px', overflow: 'hidden' }}>
        <ParallaxShape
          clipPath="polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)"
          color="#F5A623" opacity={0.06} top="8%" right="-8%" width="45%" height="50%" speed={0.2}
        />
        <span aria-hidden style={{
          position: 'absolute', right: 8, top: 8, fontFamily: 'var(--font-playfair)',
          fontSize: 'clamp(70px, 22vw, 140px)', color: '#2C3531', opacity: 0.07, fontWeight: 700,
          lineHeight: 1, pointerEvents: 'none', userSelect: 'none',
        }}>03</span>

        <Reveal>
          <p style={{ color: '#F5A623', fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 16 }}>Community</p>
          <h2 style={{ fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 'clamp(26px, 7vw, 40px)', color: '#F5F5F0', lineHeight: 1.15, marginBottom: 16 }}>
            Your batch&apos;s shared brain.
          </h2>
          <p style={{ color: '#555', fontSize: 13, lineHeight: 1.8, marginBottom: 28, maxWidth: '38ch' }}>
            Upload PYQs, share notes, drop resource links. Upvote what actually helps. Post anonymously. Content auto-expires so the feed stays clean.
          </p>
          <Link href="/signup" style={{ color: '#F5A623', fontSize: 13, fontWeight: 500 }}>Get started →</Link>
        </Reveal>

        <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { title: '3rd Sem DBMS Previous Year Papers', tag: 'CSE · 3rd sem', votes: 47, icon: '📎' },
            { title: 'CN Lab Cycle Sheet — summary notes', tag: 'CSE · Networks', votes: 23, icon: '📝' },
            { title: 'Best YouTube playlist for OS concepts', tag: 'CSE · OS', votes: 31, icon: '🔗' },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 60}>
              <MockCard dark>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <p style={{ color: '#F5F5F0', fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{item.title}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 26 }}>
                  <span style={{ color: '#444', fontSize: 11 }}>{item.tag}</span>
                  <span style={{ color: '#F5A623', fontSize: 11, fontWeight: 500, marginLeft: 'auto' }}>↑ {item.votes}</span>
                </div>
              </MockCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────── */}
      <section style={{ backgroundColor: '#F5A623', padding: '90px 24px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(15,15,15,0.4)', fontSize: 10, letterSpacing: '0.35em', textTransform: 'uppercase', marginBottom: 20, fontWeight: 500 }}>
          Free · No ads · No data selling
        </p>
        <h2 style={{ fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 'clamp(36px, 12vw, 64px)', color: '#0F0F0F', lineHeight: 1.05, marginBottom: 4 }}>
          64 seats.
        </h2>
        <h2 style={{ fontFamily: 'var(--font-playfair)', fontWeight: 700, fontSize: 'clamp(36px, 12vw, 64px)', color: '#0F0F0F', lineHeight: 1.05, marginBottom: 32 }}>
          One batch. Let&apos;s go.
        </h2>
        <p style={{ color: 'rgba(15,15,15,0.55)', fontSize: 13, marginBottom: 32, maxWidth: 280, margin: '0 auto 32px' }}>
          Sign up in 30 seconds. Install on your phone. Start tracking.
        </p>
        <Link
          href="/signup"
          data-magnetic
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '16px 32px', backgroundColor: '#0F0F0F', color: '#F5A623',
            fontWeight: 600, fontSize: 13, letterSpacing: '0.06em',
          }}
        >
          Sign up — it&apos;s free
        </Link>
      </section>
    </div>
  )
}
