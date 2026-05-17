'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  spent: number
  budget: number | null
  income: number
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function ExpenseDashboardWidget({ spent, budget, income }: Props) {
  const balance = income - spent
  const pct = budget && budget > 0 ? Math.min((spent / budget) * 100, 100) : null

  const barColor =
    pct === null ? 'bg-muted-foreground'
    : pct >= 90 ? 'bg-destructive'
    : pct >= 70 ? 'bg-yellow-500'
    : 'bg-green-500'

  const statusText =
    pct === null ? 'No budget set'
    : pct >= 100 ? `Over budget by ${formatAmount(spent - (budget ?? 0))}`
    : `${formatAmount((budget ?? 0) - spent)} remaining`

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
          <Link href="/expenses" className="text-xs text-muted-foreground hover:underline">
            View all →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Balance summary */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="font-semibold text-green-600 dark:text-green-400">
              {formatAmount(income)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Spent</p>
            <p className="font-semibold text-destructive">{formatAmount(spent)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className={`font-semibold ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
              {formatAmount(balance)}
            </p>
          </div>
        </div>

        {/* Budget bar */}
        {budget !== null && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{formatAmount(spent)} of {formatAmount(budget)} budget</span>
              <span>{pct !== null ? `${Math.round(pct)}%` : ''}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${pct ?? 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{statusText}</p>
          </div>
        )}

        {budget === null && (
          <p className="text-xs text-muted-foreground">
            <Link href="/expenses/budgets" className="underline underline-offset-2">
              Set a monthly budget
            </Link>{' '}
            to track your limit.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
