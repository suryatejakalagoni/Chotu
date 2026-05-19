'use client'

import Link from 'next/link'

export default function Header() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between pointer-events-none"
      style={{
        padding: '1.125rem 1.5rem',
        background:
          'linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, transparent 100%)',
      }}
    >
      {/* Logotype */}
      <span
        className="pointer-events-auto leading-none"
        style={{
          fontFamily: "var(--font-caveat, 'Kalam', cursive)",
          fontWeight: 700,
          fontSize: '1.625rem',
          letterSpacing: '-0.01em',
          color: '#C9A961',
        }}
      >
        CHOTU
      </span>

      {/* Nav actions */}
      <nav
        className="flex items-center gap-4 pointer-events-auto"
        aria-label="Primary navigation"
      >
        {/* Sign in — hidden on mobile (<640px) */}
        <Link
          href="/login"
          className="hidden sm:block text-sm no-underline transition-opacity hover:opacity-100"
          style={{ color: 'rgba(245,240,232,0.75)' }}
        >
          Sign in
        </Link>

        {/* Sign up button — always visible */}
        <Link
          href="/signup"
          className="text-sm font-bold no-underline whitespace-nowrap"
          style={{
            background: '#C9A961',
            color: '#0A1A10',
            padding: '0.4375rem 1.125rem',
            borderRadius: '100px',
            letterSpacing: '-0.01em',
          }}
        >
          Sign up
        </Link>
      </nav>
    </header>
  )
}
