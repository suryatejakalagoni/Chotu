import type { Metadata } from 'next'
import Link from 'next/link'
import { Playfair_Display } from 'next/font/google'

export const metadata: Metadata = {
  title: "CHOTU — Your batch's command center",
  description:
    'Assignments, exams, expenses, splits, and community hub for college students.',
}

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

/* ── Palette ───────────────────────────────────────────────────────
   #0F0F0F  near-black  (dark sections bg)
   #F5F5F0  off-white   (dark section text)
   #F5A623  saffron     (accent, CTA bg)
   #2C3531  forest      (watermark, midtone)
   #F5F0E8  parchment   (light section bg)
   #8B7355  warm brown  (light section muted text)
────────────────────────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className={playfair.variable}>

      {/* ── Fixed nav ──────────────────────────────────────────── */}
      <nav
        className="chotu-nav-animate fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{ backgroundColor: '#0F0F0F', borderBottom: '1px solid #161616' }}
      >
        <span
          className="font-bold uppercase text-sm"
          style={{ color: '#F5F5F0', letterSpacing: '0.25em' }}
        >
          CHOTU
        </span>
        <Link
          href="/login"
          className="text-sm font-medium transition-opacity hover:opacity-60"
          style={{ color: '#F5A623' }}
        >
          Log in
        </Link>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col justify-center px-6 pt-28 pb-20 overflow-hidden"
        style={{ backgroundColor: '#0F0F0F' }}
      >
        {/* Ghost watermark */}
        <span
          aria-hidden
          className="pointer-events-none select-none absolute right-[-4%] top-1/2 font-bold leading-none"
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'clamp(140px, 28vw, 320px)',
            color: '#2C3531',
            opacity: 0.06,
            transform: 'translateY(-50%) rotate(-12deg)',
          }}
        >
          CHOTU
        </span>

        {/* Saffron left-edge accent rule */}
        <div
          className="absolute left-0 top-1/4 bottom-1/4 w-0.5"
          style={{ backgroundColor: '#F5A623', opacity: 0.45 }}
        />

        <div className="relative max-w-5xl pl-5">
          {/* Eyebrow */}
          <p
            className="chotu-nav-animate text-xs uppercase mb-10 font-medium"
            style={{ color: '#3A3A3A', letterSpacing: '0.32em' }}
          >
            Built for college students · Telangana
          </p>

          {/* Headline — each line wrapped for slam reveal */}
          <div style={{ overflow: 'hidden', marginBottom: '6px' }}>
            <h1
              className="chotu-slam-1 font-bold leading-[1.02]"
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: 'clamp(52px, 10.5vw, 100px)',
                color: '#F5F5F0',
              }}
            >
              Your batch&apos;s
            </h1>
          </div>
          <div style={{ overflow: 'hidden', marginBottom: '48px' }}>
            <h1
              className="chotu-slam-2 font-bold leading-[1.02]"
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: 'clamp(52px, 10.5vw, 100px)',
                color: '#F5F5F0',
              }}
            >
              command{' '}
              <span style={{ color: '#F5A623' }}>center.</span>
            </h1>
          </div>

          {/* Feature pillars */}
          <p
            className="chotu-sub-animate text-xs uppercase mb-10"
            style={{ color: '#3A3A3A', letterSpacing: '0.28em' }}
          >
            Assignments&nbsp; ·&nbsp; Exams&nbsp; ·&nbsp; Expenses&nbsp; ·&nbsp; Splits&nbsp; ·&nbsp; Community
          </p>

          {/* CTAs */}
          <div className="chotu-cta-animate flex flex-wrap items-center gap-5">
            <Link
              href="/signup"
              className="inline-flex items-center px-7 py-3.5 font-semibold text-sm tracking-wide transition-opacity hover:opacity-85"
              style={{ backgroundColor: '#F5A623', color: '#0F0F0F' }}
            >
              Sign up free
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium transition-opacity hover:opacity-60"
              style={{ color: '#F5F5F0' }}
            >
              Log in →
            </Link>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-6 right-6 h-px"
          style={{ backgroundColor: '#1C1C1C' }}
        />
      </section>

      {/* ── Feature 01 — Assignments & Exams ───────────────────── */}
      <section
        className="relative px-6 py-24 overflow-hidden"
        style={{ backgroundColor: '#0F0F0F' }}
      >
        <span
          aria-hidden
          className="pointer-events-none select-none absolute right-4 top-4 font-bold leading-none"
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'clamp(90px, 20vw, 200px)',
            color: '#2C3531',
            opacity: 0.07,
          }}
        >
          01
        </span>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p
              className="text-xs uppercase font-medium mb-5"
              style={{ color: '#F5A623', letterSpacing: '0.3em' }}
            >
              Academics
            </p>
            <h2
              className="font-bold mb-5 leading-tight"
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: 'clamp(30px, 5vw, 52px)',
                color: '#F5F5F0',
              }}
            >
              Never miss a deadline.
            </h2>
            <p
              className="text-sm leading-[1.8] mb-7"
              style={{ color: '#555', maxWidth: '38ch' }}
            >
              Track assignments by status, subject, and due date. Upload notes
              and question papers. Set reminders. Your exam schedule links
              automatically so nothing slips through.
            </p>
            <Link
              href="/signup"
              className="text-sm font-medium transition-opacity hover:opacity-60"
              style={{ color: '#F5A623' }}
            >
              Get started →
            </Link>
          </div>

          <div className="space-y-2.5">
            {[
              { title: 'OS Assignment', subject: 'Operating Systems', due: 'Due tomorrow', status: 'In progress', pct: 65, accent: '#F5A623' },
              { title: 'DBMS Lab Report', subject: 'Database Systems', due: 'Due in 3 days', status: 'Not started', pct: 0, accent: '#444' },
              { title: 'CN Mini Project', subject: 'Computer Networks', due: 'Due in 6 days', status: 'Done', pct: 100, accent: '#4ADE80' },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg p-4 border"
                style={{ backgroundColor: '#141414', borderColor: '#222' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#F5F5F0' }}>
                      {item.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#444' }}>
                      {item.subject}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded shrink-0 ml-3"
                    style={{ backgroundColor: '#1C1C1C', color: item.accent }}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: '#222' }}>
                    <div
                      className="h-1 rounded-full"
                      style={{ width: `${item.pct}%`, backgroundColor: item.accent }}
                    />
                  </div>
                  <p className="text-xs shrink-0" style={{ color: '#444' }}>
                    {item.due}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature 02 — Expenses & Splits ─────────────────────── */}
      <section
        className="relative px-6 py-24 overflow-hidden"
        style={{ backgroundColor: '#F5F0E8' }}
      >
        <span
          aria-hidden
          className="pointer-events-none select-none absolute left-4 top-4 font-bold leading-none"
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'clamp(90px, 20vw, 200px)',
            color: '#2C3531',
            opacity: 0.07,
          }}
        >
          02
        </span>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          {/* Preview left on desktop */}
          <div className="space-y-3 order-2 md:order-1">
            <div
              className="rounded-lg p-5 border"
              style={{ backgroundColor: '#FDFAF5', borderColor: '#E8DFD0' }}
            >
              <p
                className="text-xs uppercase mb-3"
                style={{ color: '#8B7355', letterSpacing: '0.2em' }}
              >
                This month
              </p>
              <p
                className="font-bold leading-none mb-1"
                style={{
                  fontFamily: 'var(--font-playfair)',
                  fontSize: 'clamp(28px, 6vw, 36px)',
                  color: '#2C3531',
                }}
              >
                ₹2,340
              </p>
              <p className="text-xs mb-4" style={{ color: '#8B7355' }}>
                spent · ₹5,000 budget
              </p>
              <div className="h-1.5 rounded-full mb-4" style={{ backgroundColor: '#E0D5C5' }}>
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: '47%', backgroundColor: '#2C3531' }}
                />
              </div>
              <div className="border-t pt-3 space-y-1.5" style={{ borderColor: '#E8DFD0' }}>
                {[
                  { label: 'Food', amt: '₹840', pct: '36%' },
                  { label: 'Transport', amt: '₹420', pct: '18%' },
                  { label: 'Books & Study', amt: '₹680', pct: '29%' },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between text-xs"
                    style={{ color: '#8B7355' }}
                  >
                    <span>{row.label}</span>
                    <span>{row.amt} · {row.pct}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-lg p-4 border"
              style={{ backgroundColor: '#FDFAF5', borderColor: '#E8DFD0' }}
            >
              <p
                className="text-xs font-semibold uppercase mb-3"
                style={{ color: '#8B7355', letterSpacing: '0.2em' }}
              >
                Pending splits
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm" style={{ color: '#8B7355' }}>
                  <span>Rahul owes you</span>
                  <span className="font-semibold" style={{ color: '#2C3531' }}>₹350</span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: '#8B7355' }}>
                  <span>You owe Priya</span>
                  <span className="font-semibold" style={{ color: '#C0392B' }}>₹175</span>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 md:order-2">
            <p
              className="text-xs uppercase font-medium mb-5"
              style={{ color: '#8B7355', letterSpacing: '0.3em' }}
            >
              Money
            </p>
            <h2
              className="font-bold mb-5 leading-tight"
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: 'clamp(30px, 5vw, 52px)',
                color: '#2C3531',
              }}
            >
              Know where every rupee goes.
            </h2>
            <p
              className="text-sm leading-[1.8] mb-7"
              style={{ color: '#8B7355', maxWidth: '38ch' }}
            >
              Set a monthly budget and track every expense against it. Split
              canteen bills by name — your friends do not need an account.
              Settle up with one tap.
            </p>
            <Link
              href="/signup"
              className="text-sm font-medium transition-opacity hover:opacity-60"
              style={{ color: '#2C3531' }}
            >
              Get started →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature 03 — Community Hub ─────────────────────────── */}
      <section
        className="relative px-6 py-24 overflow-hidden"
        style={{ backgroundColor: '#0F0F0F' }}
      >
        <span
          aria-hidden
          className="pointer-events-none select-none absolute right-4 top-4 font-bold leading-none"
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'clamp(90px, 20vw, 200px)',
            color: '#2C3531',
            opacity: 0.07,
          }}
        >
          03
        </span>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p
              className="text-xs uppercase font-medium mb-5"
              style={{ color: '#F5A623', letterSpacing: '0.3em' }}
            >
              Community
            </p>
            <h2
              className="font-bold mb-5 leading-tight"
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: 'clamp(30px, 5vw, 52px)',
                color: '#F5F5F0',
              }}
            >
              Your batch&apos;s shared brain.
            </h2>
            <p
              className="text-sm leading-[1.8] mb-7"
              style={{ color: '#555', maxWidth: '38ch' }}
            >
              Upload previous year papers, share notes, drop resource links.
              Upvote what actually helps. Post anonymously when you need to.
              Content auto-expires so the feed stays clean.
            </p>
            <Link
              href="/signup"
              className="text-sm font-medium transition-opacity hover:opacity-60"
              style={{ color: '#F5A623' }}
            >
              Get started →
            </Link>
          </div>

          <div className="space-y-2.5">
            {[
              { title: '3rd Sem DBMS Previous Year Papers', tag: 'CSE · 3rd sem', votes: 47, icon: '📎', anon: false },
              { title: 'CN Lab Cycle Sheet — summary notes', tag: 'CSE · Networks', votes: 23, icon: '📝', anon: true },
              { title: 'Best YouTube playlist for OS concepts', tag: 'CSE · Operating Systems', votes: 31, icon: '🔗', anon: false },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg p-4 border"
                style={{ backgroundColor: '#141414', borderColor: '#222' }}
              >
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                  <p className="text-sm font-medium leading-snug" style={{ color: '#F5F5F0' }}>
                    {item.title}
                  </p>
                </div>
                <div className="flex items-center gap-2 pl-8">
                  <span className="text-xs" style={{ color: '#444' }}>{item.tag}</span>
                  {item.anon && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: '#1C1C1C', color: '#555' }}
                    >
                      anon
                    </span>
                  )}
                  <span className="text-xs ml-auto font-medium" style={{ color: '#F5A623' }}>
                    ↑ {item.votes}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA footer ─────────────────────────────────────────── */}
      <section
        className="px-6 py-28 text-center"
        style={{ backgroundColor: '#F5A623' }}
      >
        <p
          className="text-xs uppercase mb-6 font-medium"
          style={{ color: 'rgba(15,15,15,0.4)', letterSpacing: '0.35em' }}
        >
          Free · No ads · No data selling
        </p>
        <h2
          className="font-bold leading-tight"
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'clamp(38px, 8vw, 76px)',
            color: '#0F0F0F',
          }}
        >
          64 seats.
        </h2>
        <h2
          className="font-bold leading-tight mb-10"
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 'clamp(38px, 8vw, 76px)',
            color: '#0F0F0F',
          }}
        >
          One batch. Let&apos;s go.
        </h2>
        <p
          className="text-sm mb-10 max-w-xs mx-auto leading-relaxed"
          style={{ color: 'rgba(15,15,15,0.55)' }}
        >
          Sign up in 30 seconds. Install on your phone. Start tracking.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center px-8 py-4 font-semibold text-sm tracking-wide transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#0F0F0F', color: '#F5A623' }}
        >
          Sign up — it&apos;s free
        </Link>
      </section>
    </div>
  )
}
