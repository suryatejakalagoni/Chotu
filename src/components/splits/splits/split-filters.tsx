'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

interface SplitFiltersProps {
  friends: Array<{ id: string; name: string }>
  groups: Array<{ id: string; name: string }>
}

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Unsettled', value: 'pending' },
  { label: 'Settled', value: 'settled' },
]

export function SplitFilters({ friends, groups }: SplitFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentStatus = searchParams.get('status') ?? ''
  const currentFriend = searchParams.get('friend_id') ?? ''
  const currentGroup = searchParams.get('group_id') ?? ''

  const buildUrl = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(updates)) {
        if (v) {
          params.set(k, v)
        } else {
          params.delete(k)
        }
      }
      // Keep tab param
      return `${pathname}?${params.toString()}`
    },
    [pathname, searchParams]
  )

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Status chips */}
      <div className="flex rounded-md border overflow-hidden">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => router.push(buildUrl({ status: opt.value }))}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              currentStatus === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Friend filter */}
      {friends.length > 0 && (
        <select
          value={currentFriend}
          onChange={(e) => router.push(buildUrl({ friend_id: e.target.value }))}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All friends</option>
          {friends.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      )}

      {/* Group filter */}
      {groups.length > 0 && (
        <select
          value={currentGroup}
          onChange={(e) => router.push(buildUrl({ group_id: e.target.value }))}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">All groups</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      )}

      {/* Clear filters */}
      {(currentStatus || currentFriend || currentGroup) && (
        <button
          onClick={() =>
            router.push(buildUrl({ status: '', friend_id: '', group_id: '' }))
          }
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
