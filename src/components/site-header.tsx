'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/features', label: 'Features', show: 'sm' },
  { href: '/about',    label: 'About',    show: 'md' },
  { href: '/help',     label: 'Help',     show: 'md' },
] as const

export default function SiteHeader() {
  const pathname = usePathname()

  function navLinkStyle(href: string): React.CSSProperties {
    const active = pathname === href
    return {
      fontSize: '0.9rem',
      color: active ? '#16181d' : 'rgba(22,24,29,0.65)',
      textDecoration: 'none',
      fontWeight: active ? 600 : 500,
      borderBottom: active ? '1.5px solid #16181d' : '1.5px solid transparent',
      paddingBottom: '1px',
      transition: 'color 0.15s, border-color 0.15s',
    }
  }

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.75rem',
        background: 'rgba(255,255,255,0.18)',
        backdropFilter: 'blur(10px) saturate(120%)',
        WebkitBackdropFilter: 'blur(10px) saturate(120%)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {/* Brand logotype */}
      <Link
        href="/"
        style={{
          fontFamily: "'Clash Display','Space Grotesk',sans-serif",
          fontWeight: 700,
          fontSize: 'clamp(20px,2.4vw,26px)',
          letterSpacing: '.04em',
          color: '#16181d',
          textDecoration: 'none',
          lineHeight: 1,
        }}
      >
        CHOTU
      </Link>

      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
        }}
        aria-label="Primary navigation"
      >
        {NAV_LINKS.map(({ href, label, show }) => (
          <Link
            key={href}
            href={href}
            style={navLinkStyle(href)}
            className={show === 'sm' ? 'hidden sm:block' : 'hidden md:block'}
          >
            {label}
          </Link>
        ))}

        {/* Sign in — hidden on very small screens */}
        <Link
          href="/login"
          style={{
            fontSize: '0.9rem',
            color: 'rgba(22,24,29,0.75)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
          className="hidden sm:block"
        >
          Sign in
        </Link>

        {/* Sign up pill — always visible */}
        <Link
          href="/signup"
          style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#fff',
            background: '#1a1a1a',
            padding: '0.45rem 1.25rem',
            borderRadius: '100px',
            textDecoration: 'none',
            letterSpacing: '.02em',
            whiteSpace: 'nowrap',
          }}
        >
          Sign up
        </Link>
      </nav>
    </header>
  )
}
