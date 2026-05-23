import type { Metadata } from 'next'
import Link from 'next/link'
import SiteHeader from '@/components/site-header'

export const metadata: Metadata = {
  title: 'Help — CHOTU',
  description: 'Common questions about using CHOTU.',
}

const CONTAINER: React.CSSProperties = {
  maxWidth: '660px',
  margin: '0 auto',
  padding: '0 1.5rem',
}

interface FaqItem {
  q: string
  a: string
  extra?: React.ReactNode
}

// ── FAQ data ──────────────────────────────────────────────────────
// Keep extra: undefined here — React.ReactNode covers it fine without JSX
const FAQ: FaqItem[] = [
  {
    q: 'How do I sign up?',
    a: 'Tap Sign up at the top of any page. Enter your email address, choose a password, and verify your email — the link arrives in under a minute. No invite code and no payment is needed at any point.',
  },
  {
    q: 'Is CHOTU free?',
    a: 'Yes, completely. There is no paid plan, no trial that expires, and no ads. The project runs on free-tier infrastructure and is intended to stay free for the batch it was built for.',
  },
  {
    q: 'How does Calendar Sync work?',
    a: "Go to Settings → Google Calendar after you log in. CHOTU will ask for permission to create events in one of your Google calendars. Once connected, any assignment or exam you add with a due date is automatically added as a calendar event on your phone. You can disconnect at any time from the same Settings page.",
  },
  {
    q: 'Can I post in the Community Hub anonymously?',
    a: "Yes. When you create a post or upload a file, there is a toggle for anonymous posting. If you turn it on, your name is not shown on the post — only the content and the file. Your account is still linked internally for moderation, but other students cannot see who posted.",
  },
  {
    q: 'I forgot my password. What do I do?',
    a: 'On the Sign in page, tap Forgot password. Enter the email address you signed up with and you will receive a reset link. Check your spam folder if it does not arrive within a couple of minutes.',
  },
  {
    q: 'Does CHOTU work offline?',
    a: "CHOTU is a progressive web app (PWA), so once you have loaded the app at least once, you can read your existing data — assignments, exams, expenses — without an internet connection. Submitting new entries or uploading files requires a connection.",
  },
  {
    q: 'How do I install CHOTU on my phone?',
    a: "Open CHOTU in Chrome on Android, tap the three-dot menu in the top-right corner, and select Add to Home screen. The app icon will appear on your home screen like any installed app. On iOS Safari, tap the Share button and choose Add to Home Screen.",
  },
  {
    q: 'How do I report a bug or suggest a feature?',
    a: 'Once you are logged in, use the feedback option in Settings (it will appear as the app is updated). For urgent issues, the email address is in the Settings page.',
  },
]

export default function HelpPage() {
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
        <div style={{ ...CONTAINER, paddingTop: '3.5rem', paddingBottom: '2rem' }}>
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
            Help &amp; FAQ
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
            Common questions.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-fraunces),'Fraunces',serif",
              fontSize: 'clamp(1rem,2.5vw,1.125rem)',
              lineHeight: 1.65,
              color: '#3a3d44',
              maxWidth: '42ch',
            }}
          >
            If your question is not here, the answer is probably one screen away
            inside the app after you sign in.
          </p>
        </div>

        {/* ── FAQ list ──────────────────────────────────────────── */}
        <div style={CONTAINER}>
          {FAQ.map((item, i) => (
            <div
              key={i}
              style={{
                paddingTop: '1.75rem',
                paddingBottom: '1.75rem',
                borderBottom: '1px solid rgba(0,0,0,0.07)',
              }}
            >
              <h2
                style={{
                  fontFamily: "'Clash Display','Space Grotesk',sans-serif",
                  fontWeight: 700,
                  fontSize: 'clamp(1rem,3vw,1.1875rem)',
                  letterSpacing: '.01em',
                  color: '#16181d',
                  marginBottom: '0.625rem',
                }}
              >
                {item.q}
              </h2>
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
                {item.a}
              </p>
            </div>
          ))}
        </div>

        {/* ── Still stuck CTA ───────────────────────────────────── */}
        <div
          style={{
            ...CONTAINER,
            paddingTop: '3.5rem',
            paddingBottom: '5rem',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg,#f7f8fa 0%,#eceef1 100%)',
              borderRadius: '16px',
              padding: 'clamp(1.5rem,5vw,2.5rem)',
            }}
          >
            <h2
              style={{
                fontFamily: "'Clash Display','Space Grotesk',sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(1.125rem,3.5vw,1.375rem)',
                letterSpacing: '.02em',
                color: '#16181d',
                marginBottom: '0.5rem',
              }}
            >
              Still have a question?
            </h2>
            <p
              style={{
                fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
                fontSize: 'clamp(0.9rem,2vw,1rem)',
                lineHeight: 1.65,
                color: '#3a3d44',
                marginBottom: '1.5rem',
                maxWidth: '42ch',
              }}
            >
              Sign in and check Settings — the feedback link and contact details
              are in there. Or just start using the app; most things explain
              themselves pretty quickly.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link
                href="/signup"
                style={{
                  display: 'inline-block',
                  background: '#1a1a1a',
                  color: '#fff',
                  fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  padding: '0.75rem 2rem',
                  borderRadius: '100px',
                  textDecoration: 'none',
                  letterSpacing: '.02em',
                }}
              >
                Sign up free
              </Link>
              <Link
                href="/login"
                style={{
                  display: 'inline-block',
                  border: '1.5px solid rgba(0,0,0,0.18)',
                  color: '#16181d',
                  fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
                  fontWeight: 500,
                  fontSize: '0.9375rem',
                  padding: '0.75rem 2rem',
                  borderRadius: '100px',
                  textDecoration: 'none',
                }}
              >
                Sign in
              </Link>
            </div>
          </div>

          {/* ── Contact line ──────────────────────────────────── */}
          <p
            style={{
              marginTop: '2rem',
              textAlign: 'center',
              fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
              fontSize: '0.875rem',
              color: 'rgba(22,24,29,0.5)',
              lineHeight: 1.6,
            }}
          >
            Questions? Reach out:{' '}
            <a
              href="mailto:suryatejakalagoni@gmail.com"
              style={{
                color: '#16181d',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              suryatejakalagoni@gmail.com
            </a>
          </p>
        </div>
      </main>
    </>
  )
}
