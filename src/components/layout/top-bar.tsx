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
  { href: '/dashboard',   label: 'Home',        icon: '⌂' },
  { href: '/expenses',    label: 'Expenses',    icon: '₹' },
  { href: '/assignments', label: 'Assignments', icon: '✎' },
  { href: '/exams',       label: 'Exams',       icon: '◎' },
  { href: '/splits',      label: 'Splits',      icon: '⇌' },
  { href: '/community',   label: 'Community',   icon: '⊕' },
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

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  function toggleTheme() {
    const next = !isDark
    function apply() {
      setIsDark(next)
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('chotu-theme', next ? 'dark' : 'light')
    }
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
    <>
      <header className="navbar">
        <div className="navbar__content">
          {/* Brand */}
          <Link href="/dashboard" className="navbar__brand">CHOTU</Link>

          {/* Wave nav — desktop only */}
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

          {/* Right utilities — desktop only */}
          <div className="navbar__right">
            <button
              className="nav-util theme-toggle"
              onClick={toggleTheme}
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

            <div className="nav-util nav-util--profile"
              onClick={() => setProfileOpen(p => !p)}>
              <span className="av">{initials}</span>
              <span className="nav-util__name">
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

          {/* Hamburger — LAST in DOM so server/client order never shifts.
              CSS `order: -2` pulls it visually to the left on mobile. */}
          <button
            className="navbar__hamburger"
            onClick={() => setMenuOpen(p => !p)}
            aria-expanded={menuOpen}
            aria-label="Open navigation"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {menuOpen
                ? <path d="M18 6L6 18M6 6l12 12" />
                : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </header>

      {/* ── Mobile module overlay — rendered outside <header> so no stacking/overflow issues ── */}
      {menuOpen && (
        <div className="mob-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mob-sheet" onClick={e => e.stopPropagation()}>
            {/* Sheet header */}
            <div className="mob-sheet__head">
              <span className="mob-sheet__title">Modules</span>
              <button className="mob-sheet__close" onClick={() => setMenuOpen(false)}
                aria-label="Close navigation">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Module list */}
            <nav className="mob-sheet__nav">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`mob-mod-link${isActive(link.href) ? ' active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="mob-mod-icon">{link.icon}</span>
                  <span className="mob-mod-label">{link.label}</span>
                  {isActive(link.href) && <span className="mob-mod-dot" />}
                </Link>
              ))}
              {isAdmin && (
                <Link href="/admin/reports" className="mob-mod-link mod-warn"
                  onClick={() => setMenuOpen(false)}>
                  <span className="mob-mod-icon">⚑</span>
                  <span className="mob-mod-label">Mod Panel</span>
                </Link>
              )}
            </nav>

            {/* Sheet footer */}
            <div className="mob-sheet__foot">
              <button className="mob-foot-btn" onClick={toggleTheme}>
                {isDark
                  ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg> Light mode</>
                  : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Dark mode</>
                }
              </button>
              <form action={logOut}>
                <button type="submit" className="mob-foot-btn danger">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
