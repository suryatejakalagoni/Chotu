'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GroupCard } from './group-card'
import { GroupForm } from './group-form'
import type { GroupWithBalance } from '@/types/splits'

interface GroupListProps {
  groups: GroupWithBalance[]
}

export function GroupList({ groups }: GroupListProps) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Groups</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          + Add Group
        </Button>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No groups yet. Create one to organise splits for trips or events.
        </p>
      )}

      <div className="space-y-2">
        {groups.map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}
      </div>

      {showAdd && <GroupForm mode="add" onClose={() => setShowAdd(false)} />}
    </div>
  )
}
