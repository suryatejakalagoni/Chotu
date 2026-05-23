import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '@/components/site-header'

export const metadata: Metadata = {
  title: 'About — CHOTU',
  description:
    'CHOTU is a small, personal organiser built for college students in India.',
}

const CONTAINER: React.CSSProperties = {
  maxWidth: '660px',
  margin: '0 auto',
  padding: '0 1.5rem',
}

const BODY: React.CSSProperties = {
  fontFamily: "var(--font-fraunces),'Fraunces',serif",
  fontSize: 'clamp(1rem,2.5vw,1.125rem)',
  lineHeight: 1.75,
  color: '#3a3d44',
  marginBottom: '1.5rem',
  maxWidth: '54ch',
}

const SUBHEAD: React.CSSProperties = {
  fontFamily: "'Clash Display','Space Grotesk',sans-serif",
  fontWeight: 700,
  fontSize: 'clamp(1.125rem,3.5vw,1.375rem)',
  letterSpacing: '.02em',
  color: '#16181d',
  marginBottom: '0.625rem',
  marginTop: '2.5rem',
}

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main
        style={{
          minHeight: '100vh',
          background: '#fff',
          paddingTop: '5rem',
        }}
      >
        {/* ── Page hero ─────────────────────────────────────────── */}
        <div style={{ ...CONTAINER, paddingTop: '3.5rem', paddingBottom: '3rem' }}>
          <p
            style={{
              fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
              fontSize: '0.8125rem',
              fontWeight: 600,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: 'rgba(22,24,29,0.45)',
              marginBottom: '0.75rem',
            }}
          >
            About CHOTU
          </p>
          <h1
            style={{
              fontFamily: "'Clash Display','Space Grotesk',sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(2rem,7vw,3.25rem)',
              letterSpacing: '.01em',
              lineHeight: 1.1,
              color: '#16181d',
              marginBottom: '1.5rem',
            }}
          >
            One quiet place<br />for college life.
          </h1>

          {/* ── Body copy ───────────────────────────────────────── */}
          <h2 style={SUBHEAD}>Where it started</h2>
          <p style={BODY}>
            CHOTU started as a fix for a very specific problem: keeping a batch of
            64 classmates on the same page during the semester. Deadlines came through
            on WhatsApp. Notes were scattered across Google Drive links that expired.
            Expense splits lived in spreadsheets that nobody updated. Exam dates had to
            be cross-checked against three different sources.
          </p>
          <p style={BODY}>
            The goal was simple — put all of that in one place, make it work on the
            phones people actually have, and keep it free.
          </p>

          <h2 style={SUBHEAD}>What it is</h2>
          <p style={BODY}>
            CHOTU is a personal organiser for college students. It tracks assignments
            and exam dates, logs expenses and income, lets your batch share notes and
            files privately, and keeps your schedule in sync with Google Calendar.
            It is not a social network. It is not a learning platform. It is just the
            organisational layer that college life seems to be missing.
          </p>

          <h2 style={SUBHEAD}>Who it&apos;s for</h2>
          <p style={BODY}>
            Students in Indian colleges who are using a mid-range Android phone,
            want something faster than opening five different apps, and are tired of
            losing track of deadlines in group chats. No invite code, no batch
            subscription, no premium tier. Sign up and start using it.
          </p>

          <h2 style={SUBHEAD}>How it&apos;s built</h2>
          <p style={BODY}>
            CHOTU is a progressive web app — it installs from the browser like a
            normal app, works offline for reading your data, and does not need a
            Play Store listing. It runs on free-tier infrastructure with a ₹0
            monthly cost. The entire project was built in 15 days.
          </p>
        </div>

        {/* ── Bottom CTA ────────────────────────────────────────── */}
        <div
          style={{
            background: 'linear-gradient(180deg,#fff 0%,#f4f5f7 100%)',
            borderTop: '1px solid rgba(0,0,0,0.07)',
          }}
        >
          <div
            style={{
              ...CONTAINER,
              paddingTop: '3rem',
              paddingBottom: '4.5rem',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-fraunces),'Fraunces',serif",
                fontSize: 'clamp(1.0625rem,3vw,1.25rem)',
                color: '#3a3d44',
                marginBottom: '1.5rem',
              }}
            >
              Sounds useful? It takes about 30 seconds to sign up.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/signup"
                style={{
                  display: 'inline-block',
                  background: '#1a1a1a',
                  color: '#fff',
                  fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
                  fontWeight: 700,
                  fontSize: '1rem',
                  padding: '0.875rem 2.25rem',
                  borderRadius: '100px',
                  textDecoration: 'none',
                  letterSpacing: '.02em',
                }}
              >
                Get started
              </Link>
              <Link
                href="/features"
                style={{
                  display: 'inline-block',
                  border: '1.5px solid rgba(0,0,0,0.18)',
                  color: '#16181d',
                  fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
                  fontWeight: 500,
                  fontSize: '1rem',
                  padding: '0.875rem 2.25rem',
                  borderRadius: '100px',
                  textDecoration: 'none',
                }}
              >
                See all features
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
