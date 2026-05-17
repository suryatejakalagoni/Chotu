'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SplitCard } from './split-card'
import { SplitFilters } from './split-filters'
import { SplitForm } from './split-form'
import type { SplitWithShares, FriendWithBalance, GroupWithBalance } from '@/types/splits'

interface SplitListProps {
  splits: SplitWithShares[]
  friends: FriendWithBalance[]
  groups: GroupWithBalance[]
}

export function SplitList({ splits, friends, groups }: SplitListProps) {
  const [showAdd, setShowAdd] = useState(false)
  const searchParams = useSearchParams()

  const activeFriends = friends.filter((f) => !f.deleted_at)

  const friendsForPicker = activeFriends.map((f) => ({ id: f.id, name: f.name }))
  const groupsForPicker = groups.map((g) => ({ id: g.id, name: g.name }))
  const friendsForFilter = friends.map((f) => ({ id: f.id, name: f.name }))

  const status = searchParams.get('status') ?? ''
  const friendId = searchParams.get('friend_id') ?? ''
  const groupId = searchParams.get('group_id') ?? ''

  const hasFilters = Boolean(status || friendId || groupId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">Splits</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          + New Split
        </Button>
      </div>

      <SplitFilters friends={friendsForFilter} groups={groupsForPicker} />

      {splits.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? 'No splits match the current filters.'
              : 'No splits yet. Create one to start tracking shared expenses.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {splits.map((s) => (
            <SplitCard
              key={s.id}
              split={s}
              friends={friendsForPicker}
              groups={groupsForPicker}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <SplitForm
          mode="add"
          friends={friendsForPicker}
          groups={groupsForPicker}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
