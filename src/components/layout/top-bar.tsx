import Link from 'next/link'
import { logOut } from '@/lib/actions/auth'
import { ThemeToggle } from './theme-toggle'
import { SearchBar } from './search-bar'

interface TopBarProps {
  isAdmin?: boolean
  userName?: string
}

export function TopBar({ isAdmin = false, userName }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
        {/* Logo */}
        <Link
          href="/dashboard"
          className="font-bold text-sm uppercase tracking-widest shrink-0 hover:opacity-70 transition-opacity"
        >
          CHOTU
        </Link>

        {/* Global search */}
        <div className="flex-1 max-w-sm hidden sm:block">
          <SearchBar />
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1">
          {/* Nav links — hidden on small screens */}
          <nav className="hidden lg:flex items-center text-sm mr-1">
            {(
              [
                ['/expenses',    'Expenses'],
                ['/assignments', 'Assignments'],
                ['/exams',       'Exams'],
                ['/splits',      'Splits'],
                ['/community',   'Community'],
              ] as [string, string][]
            ).map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
              >
                {label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin/reports"
                className="px-2.5 py-1.5 text-orange-500 hover:text-orange-600 rounded transition-colors font-medium"
              >
                Mod
              </Link>
            )}
          </nav>

          <ThemeToggle />

          {userName && (
            <span className="hidden sm:block text-xs text-muted-foreground px-2 truncate max-w-[120px]">
              {userName}
            </span>
          )}

          <form action={logOut}>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              Log out
            </button>
          </form>
        </div>
      </div>

      {/* Mobile search row */}
      <div className="sm:hidden px-4 pb-2">
        <SearchBar />
      </div>
    </header>
  )
}
