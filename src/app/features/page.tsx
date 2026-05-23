import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Features — CHOTU',
  description:
    'Assignment tracker, exam countdown, expense tracker, community hub, and Google Calendar sync — all in one place.',
}

// ── Shared style tokens ───────────────────────────────────────────
const CONTAINER: React.CSSProperties = {
  maxWidth: '660px',
  margin: '0 auto',
  padding: '0 1.5rem',
}

const SECTION: React.CSSProperties = {
  paddingTop: '3rem',
  paddingBottom: '3rem',
  borderBottom: '1px solid rgba(0,0,0,0.07)',
}

interface FeatureSection {
  emoji: string
  name: string
  summary: string
  detail: string
}

const FEATURES: FeatureSection[] = [
  {
    emoji: '📋',
    name: 'Assignment Tracker',
    summary: 'Every deadline in one place.',
    detail:
      'Add an assignment, pick the due date, and attach files if you need to. The dashboard widget shows everything due this week so nothing catches you off guard. Mark it done when it\'s submitted — the archive keeps a record in case you need it later.',
  },
  {
    emoji: '⏱️',
    name: 'Exam Tracker',
    summary: 'A countdown to every paper on your schedule.',
    detail:
      'Add the subject, the exam date, and any prep notes you want to keep. CHOTU shows exactly how many days are left and gives you a topic checklist so you can tick off what you\'ve covered. No more last-minute "wait, when is the end-sem?"',
  },
  {
    emoji: '💸',
    name: 'Expense Tracker',
    summary: 'See where your money actually goes.',
    detail:
      'Log a purchase, assign it a category, and CHOTU handles the sums. You can set a monthly budget, track income alongside spending, and check your balance at any point in the month. No spreadsheets, no mental arithmetic.',
  },
  {
    emoji: '🗂️',
    name: 'Community Hub',
    summary: 'Share notes and files with your batch.',
    detail:
      'Upload PDFs, images, and documents for your classmates to find. Post anonymously if you want to — your name is never required. Upvote what is useful. The hub is private to your group, not visible to the public.',
  },
  {
    emoji: '📅',
    name: 'Calendar Sync',
    summary: 'Your schedule, straight to Google Calendar.',
    detail:
      'Connect CHOTU to your Google account once from Settings and your phone\'s calendar stays in sync automatically. Every exam and assignment you add with a due date appears as a calendar event. One less app to check before bed.',
  },
]

export default function FeaturesPage() {
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
        <div style={{ ...CONTAINER, paddingTop: '3.5rem', paddingBottom: '1rem' }}>
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
            What CHOTU does
          </p>
          <h1
            style={{
              fontFamily: "'Clash Display','Space Grotesk',sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(2rem,7vw,3.25rem)',
              letterSpacing: '.01em',
              lineHeight: 1.1,
              color: '#16181d',
              marginBottom: '1rem',
            }}
          >
            Five tools.<br />One quiet app.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-fraunces),'Fraunces',serif",
              fontSize: 'clamp(1rem,2.5vw,1.1875rem)',
              lineHeight: 1.65,
              color: '#3a3d44',
              maxWidth: '42ch',
              marginBottom: 0,
            }}
          >
            CHOTU is not trying to do everything. It does five specific things for
            college students — and it tries to do each one without getting in your way.
          </p>
        </div>

        {/* ── Feature sections ──────────────────────────────────── */}
        <div style={CONTAINER}>
          {FEATURES.map((f) => (
            <section key={f.name} style={SECTION}>
              <div
                style={{
                  fontSize: '2rem',
                  marginBottom: '0.75rem',
                  lineHeight: 1,
                }}
                aria-hidden="true"
              >
                {f.emoji}
              </div>
              <h2
                style={{
                  fontFamily: "'Clash Display','Space Grotesk',sans-serif",
                  fontWeight: 700,
                  fontSize: 'clamp(1.25rem,4vw,1.625rem)',
                  letterSpacing: '.02em',
                  color: '#16181d',
                  marginBottom: '0.25rem',
                }}
              >
                {f.name}
              </h2>
              <p
                style={{
                  fontFamily: "var(--font-fraunces),'Fraunces',serif",
                  fontWeight: 600,
                  fontSize: 'clamp(0.9375rem,2.5vw,1.0625rem)',
                  color: '#16181d',
                  marginBottom: '0.625rem',
                }}
              >
                {f.summary}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
                  fontSize: 'clamp(0.9rem,2vw,1rem)',
                  lineHeight: 1.7,
                  color: '#3a3d44',
                  maxWidth: '54ch',
                  margin: 0,
                }}
              >
                {f.detail}
              </p>
            </section>
          ))}
        </div>

        {/* ── Bottom CTA ────────────────────────────────────────── */}
        <div
          style={{
            ...CONTAINER,
            paddingTop: '3.5rem',
            paddingBottom: '5rem',
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
            All five features, free, right now.
          </p>
          <Link
            href="/signup"
            style={{
              display: 'inline-block',
              background: '#1a1a1a',
              color: '#fff',
              fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
              fontWeight: 700,
              fontSize: '1rem',
              padding: '0.875rem 2.5rem',
              borderRadius: '100px',
              textDecoration: 'none',
              letterSpacing: '.02em',
            }}
          >
            Get started — it&apos;s free
          </Link>
        </div>
      </main>
    </>
  )
}
