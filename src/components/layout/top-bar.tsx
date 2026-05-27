'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { logOut } from '@/lib/actions/auth'

interface TopBarProps {
  isAdmin?: boolean
  userName?: string
}

const NAV_LINKS = [
  { href: '/dashboard',   label: 'Home' },
  { href: '/expenses',    label: 'Expenses' },
  { href: '/assignments', label: 'Assignments' },
  { href: '/exams',       label: 'Exams' },
  { href: '/splits',      label: 'Splits' },
  { href: '/community',   label: 'Community' },
]

const ArrowSvg = () => (
  <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
  </svg>
)

export function TopBar({ isAdmin = false, userName }: TopBarProps) {
  const pathname = usePathname()
  const [isDark, setIsDark] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('chotu-theme')
    const dark = saved !== 'light'
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  // Close mobile menu when navigating
  useEffect(() => { setMenuOpen(false) }, [pathname])

  function toggleTheme() {
    const next = !isDark
    function apply() {
      setIsDark(next)
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('chotu-theme', next ? 'dark' : 'light')
    }
    // Polygon-slice View Transition (from css-has-hover-nav)
    if ('startViewTransition' in document) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(document as any).startViewTransition(apply)
    } else {
      apply()
    }
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const initials = userName
    ? userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <header className="navbar">
      <div className="navbar__content">
        {/* Brand */}
        <Link href="/dashboard" className="navbar__brand">CHOTU</Link>

        {/* Wave nav — desktop */}
        <nav className="navbar__nav">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${isActive(link.href) ? ' active' : ''}`}
            >
              <span className="nav-link__inner">
                <span>{link.label}</span>
                <ArrowSvg />
              </span>
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin/reports" className="nav-link" style={{ color: 'var(--warn)' }}>
              <span className="nav-link__inner">
                <span>Mod</span>
                <ArrowSvg />
              </span>
            </Link>
          )}
        </nav>

        {/* Right utilities — desktop */}
        <div className="navbar__right">
          <button
            className="nav-util theme-toggle"
            onClick={toggleTheme}
            title={isDark ? 'Switch to light' : 'Switch to dark'}
            aria-label={isDark ? 'Switch to light' : 'Switch to dark'}
          >
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          <div className="nav-util" style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => setProfileOpen(p => !p)}>
            <span className="av">{initials}</span>
            <span style={{ textTransform: 'none', fontSize: 13, letterSpacing: 0 }}>
              {userName ?? 'Account'}
            </span>
            {profileOpen && (
              <div className="profile-pop" onClick={e => e.stopPropagation()}>
                <Link href="/settings" className="row" onClick={() => setProfileOpen(false)}>
                  ⚙ Settings
                </Link>
                <div className="divider" />
                <form action={logOut}>
                  <button type="submit" className="row danger" style={{ width: '100%', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
                    ✕ Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Hamburger — mobile only */}
        <button
          className="navbar__hamburger"
          onClick={() => setMenuOpen(p => !p)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ rotate: menuOpen ? '45deg' : '0deg', transition: 'rotate 0.25s' }}>
            <path d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Mobile slide-down menu */}
      <div className={`navbar__mobile-menu${menuOpen ? ' open' : ''}`}>
        {NAV_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`mobile-nav-link${isActive(link.href) ? ' active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            <span>{link.label}</span>
            <ArrowSvg />
          </Link>
        ))}
        {isAdmin && (
          <Link href="/admin/reports" className="mobile-nav-link"
            style={{ color: 'var(--warn)' }} onClick={() => setMenuOpen(false)}>
            <span>Mod</span>
            <ArrowSvg />
          </Link>
        )}
        <div className="mobile-nav-foot">
          <button className="mobile-theme-btn" onClick={toggleTheme}>
            {isDark ? '☀ Light mode' : '☾ Dark mode'}
          </button>
        </div>
      </div>
    </header>
  )
}
