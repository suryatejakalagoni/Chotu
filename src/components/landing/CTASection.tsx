import Link from 'next/link'

const BG     = '#0A1A10'
const CREAM  = '#F5F0E8'
const GOLD   = '#C9A961'
const DIM    = 'rgba(245,240,232,0.45)'
const BORDER = 'rgba(245,240,232,0.08)'
const FF     = "var(--font-caveat,'Kalam',cursive)"
const FM     = "var(--font-geist-mono,monospace)"

export default function CTASection() {
  return (
    <section
      style={{
        background: BG,
        borderTop: `1px solid ${BORDER}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(5rem,12vh,8rem) 1.5rem clamp(4rem,10vh,7rem)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Gold radial glow */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 'min(80vw,600px)',
          height: 'min(80vw,600px)',
          background: 'radial-gradient(circle,rgba(201,169,97,0.08) 0%,transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* Wordmark */}
      <span
        style={{
          fontFamily: FF,
          fontWeight: 700,
          fontSize: 'clamp(2.5rem,8vw,5rem)',
          letterSpacing: '-0.02em',
          color: GOLD,
          lineHeight: 1,
          marginBottom: '1.25rem',
          position: 'relative',
        }}
      >
        CHOTU
      </span>

      <p
        style={{
          fontFamily: FF,
          fontSize: 'clamp(1.125rem,3vw,1.625rem)',
          fontWeight: 400,
          lineHeight: 1.3,
          color: CREAM,
          maxWidth: '26ch',
          marginBottom: '2.75rem',
          position: 'relative',
        }}
      >
        Your student life, organized.
      </p>

      {/* CTA buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <Link
          href="/signup"
          style={{
            background: GOLD,
            color: BG,
            fontWeight: 700,
            fontSize: '1rem',
            padding: '0.875rem 2.25rem',
            borderRadius: '100px',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          Start using CHOTU
        </Link>
        <Link
          href="/login"
          style={{
            color: DIM,
            fontSize: '0.9375rem',
            textDecoration: 'none',
            padding: '0.875rem 0.5rem',
            transition: 'color 0.2s',
          }}
        >
          Sign in
        </Link>
      </div>

      {/* Fine print */}
      <p
        style={{
          marginTop: '2rem',
          fontFamily: FM,
          fontSize: '0.6875rem',
          letterSpacing: '0.06em',
          color: 'rgba(245,240,232,0.28)',
          position: 'relative',
        }}
      >
        FREE · NO BATCH CODE REQUIRED
      </p>
    </section>
  )
}
