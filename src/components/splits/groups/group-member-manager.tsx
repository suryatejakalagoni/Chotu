'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { addMemberToGroup, removeMemberFromGroup } from '@/lib/actions/groups'

interface Member {
  id: string
  friend_id: string
  name: string
}

interface Friend {
  id: string
  name: string
}

interface GroupMemberManagerProps {
  groupId: string
  currentMembers: Member[]
  allFriends: Friend[]
  onRefresh?: () => void
}

export function GroupMemberManager({
  groupId,
  currentMembers,
  allFriends,
  onRefresh,
}: GroupMemberManagerProps) {
  const [error, setError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string>('')
  const [adding, setAdding] = useState(false)

  const memberFriendIds = new Set(currentMembers.map((m) => m.friend_id))
  const available = allFriends.filter((f) => !memberFriendIds.has(f.id))

  const handleRemove = async (friendId: string) => {
    setError(null)
    setLoadingId(friendId)
    const result = await removeMemberFromGroup(groupId, friendId)
    setLoadingId(null)
    if (result.error) {
      setError(result.error)
    } else {
      onRefresh?.()
    }
  }

  const handleAdd = async () => {
    if (!addingId) return
    setError(null)
    setAdding(true)
    const result = await addMemberToGroup(groupId, addingId)
    setAdding(false)
    if (result.error) {
      setError(result.error)
    } else {
      setAddingId('')
      onRefresh?.()
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Members ({currentMembers.length})</p>

      {currentMembers.length === 0 && (
        <p className="text-xs text-muted-foreground">No members yet.</p>
      )}

      <div className="space-y-1">
        {currentMembers.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between py-1.5 px-2 rounded-md border text-sm"
          >
            <span>{m.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => handleRemove(m.friend_id)}
              disabled={loadingId === m.friend_id}
            >
              {loadingId === m.friend_id ? '…' : 'Remove'}
            </Button>
          </div>
        ))}
      </div>

      {available.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={addingId}
            onChange={(e) => setAddingId(e.target.value)}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select a friend to add…</option>
            {available.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!addingId || adding}
          >
            {adding ? '…' : 'Add'}
          </Button>
        </div>
      )}

      {available.length === 0 && allFriends.length > 0 && (
        <p className="text-xs text-muted-foreground">All friends are already in this group.</p>
      )}

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
