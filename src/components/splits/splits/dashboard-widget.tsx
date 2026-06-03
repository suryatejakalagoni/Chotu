import Link from 'next/link'
import { getTotalOwed } from '@/lib/actions/splits'
import { getFriendsWithBalance } from '@/lib/actions/friends'
import { formatRupees } from '@/lib/split-utils'

export async function SplitsDashboardWidget() {
  const [totalOwed, { friends }] = await Promise.all([
    getTotalOwed(),
    getFriendsWithBalance(),
  ])

  const withBalance = friends
    .filter((f) => f.total_owed > 0)
    .sort((a, b) => b.total_owed - a.total_owed)
    .slice(0, 3)

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">Bunk Calculator</h2>
        <Link
          href="/splits"
          className="text-xs text-primary hover:underline"
        >
          View all →
        </Link>
      </div>

      {totalOwed === 0 ? (
        <p className="text-sm text-green-600 font-medium">All settled ✓</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            <span className="text-lg font-bold text-orange-600">
              {formatRupees(totalOwed)}
            </span>{' '}
            pending from {withBalance.length} friend{withBalance.length !== 1 ? 's' : ''}
          </p>

          {withBalance.length > 0 && (
            <div className="space-y-1">
              {withBalance.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{f.name}</span>
                  <span className="font-medium text-orange-600">
                    {formatRupees(f.total_owed)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
