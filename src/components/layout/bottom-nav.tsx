'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, BookOpen, Receipt, Users, GraduationCap, ArrowLeftRight } from 'lucide-react'

const NAV = [
  { href: '/dashboard',   label: 'Home',        Icon: LayoutDashboard },
  { href: '/assignments', label: 'Assignments',  Icon: BookOpen },
  { href: '/exams',       label: 'Exams',        Icon: GraduationCap },
  { href: '/expenses',    label: 'Expenses',     Icon: Receipt },
  { href: '/splits',      label: 'Bunk Calc',    Icon: ArrowLeftRight },
  { href: '/community',   label: 'Community',    Icon: Users },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm">
      <div className="flex h-14">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={{ color: active ? '#F5A623' : undefined }}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 1.8}
                className={active ? '' : 'text-muted-foreground'}
              />
              <span
                className="text-[10px] font-medium leading-none"
                style={{ color: active ? '#F5A623' : undefined }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
