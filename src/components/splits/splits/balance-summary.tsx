'use client'

import Link from 'next/link'
import { formatRupees } from '@/lib/split-utils'
import type { FriendWithBalance } from '@/types/splits'

interface BalanceSummaryProps {
  friends: FriendWithBalance[]
  totalOwed: number
}

export function BalanceSummary({ friends, totalOwed }: BalanceSummaryProps) {
  const withBalance = friends
    .filter((f) => f.total_owed > 0)
    .sort((a, b) => b.total_owed - a.total_owed)

  if (totalOwed === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-2">🎉</p>
        <p className="text-lg font-semibold text-green-600">All settled!</p>
        <p className="text-sm text-muted-foreground mt-1">
          No pending balances.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-orange-50 border-orange-100 p-4 text-center">
        <p className="text-3xl font-bold text-orange-600">
          {formatRupees(totalOwed)}
        </p>
        <p className="text-sm text-orange-700 mt-0.5">total pending</p>
      </div>

      <div className="space-y-2">
        {withBalance.map((f) => (
          <div
            key={f.id}
            className="flex items-center justify-between py-2.5 px-3 rounded-md border text-sm"
          >
            <span className="font-medium">{f.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-orange-600 font-medium">
                {formatRupees(f.total_owed)}
              </span>
              <Link
                href={`/splits?tab=splits&friend_id=${f.id}`}
                className="text-xs text-primary hover:underline"
              >
                View
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
