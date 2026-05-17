'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FriendCard } from './friend-card'
import { FriendForm } from './friend-form'
import type { FriendWithBalance } from '@/types/splits'

interface FriendListProps {
  friends: FriendWithBalance[]
}

export function FriendList({ friends }: FriendListProps) {
  const [showAdd, setShowAdd] = useState(false)

  const active = friends.filter((f) => !f.deleted_at)
  const removed = friends.filter((f) => f.deleted_at)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Friends</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          + Add Friend
        </Button>
      </div>

      {active.length === 0 && removed.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No friends yet. Add one to start splitting expenses.
        </p>
      )}

      {active.length === 0 && removed.length > 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No active friends. Add one to start splitting expenses.
        </p>
      )}

      <div className="space-y-2">
        {active.map((f) => (
          <FriendCard key={f.id} friend={f} />
        ))}
      </div>

      {removed.length > 0 && (
        <div className="space-y-2 pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Removed friends (history preserved)
          </p>
          {removed.map((f) => (
            <FriendCard key={f.id} friend={f} />
          ))}
        </div>
      )}

      {showAdd && <FriendForm mode="add" onClose={() => setShowAdd(false)} />}
    </div>
  )
}
