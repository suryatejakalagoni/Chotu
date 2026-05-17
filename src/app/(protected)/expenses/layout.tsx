import Link from 'next/link'
import { type ReactNode } from 'react'

const tabs = [
  { href: '/expenses', label: 'Expenses' },
  { href: '/expenses/income', label: 'Income' },
  { href: '/expenses/budgets', label: 'Budgets' },
  { href: '/expenses/categories', label: 'Categories' },
]

export default function ExpensesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Expense sections">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="px-4 py-3 text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-muted-foreground transition-colors"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-6">{children}</div>
    </div>
  )
}
