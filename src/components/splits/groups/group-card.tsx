'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { GroupForm } from './group-form'
import { GroupMemberManager } from './group-member-manager'
import { deleteGroup, getGroupMembers } from '@/lib/actions/groups'
import { formatRupees } from '@/lib/split-utils'
import type { GroupWithBalance } from '@/types/splits'

interface GroupCardProps {
  group: GroupWithBalance
  friends: Array<{ id: string; name: string }>
}

type Member = { id: string; friend_id: string; name: string }

export function GroupCard({ group, friends }: GroupCardProps) {
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const loadMembers = useCallback(async () => {
    setMembersLoading(true)
    const result = await getGroupMembers(group.id)
    setMembers(result.members)
    setMembersLoading(false)
  }, [group.id])

  useEffect(() => {
    if (showMembers) {
      loadMembers()
    }
  }, [showMembers, loadMembers])

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteGroup(group.id)
    setDeleting(false)

    if (result.error) {
      setDeleteError(result.error)
      return
    }

    setShowDelete(false)
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{group.name}</span>
                <button
                  onClick={() => setShowMembers(true)}
                  className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 hover:bg-blue-200 transition-colors"
                >
                  {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                </button>
                {group.total_owed > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5">
                    {formatRupees(group.total_owed)} owed
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5">
                    Settled
                  </span>
                )}
              </div>
              {group.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {group.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowEdit(true)}
                aria-label="Edit group"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => setShowDelete(true)}
                aria-label="Delete group"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit name/description */}
      {showEdit && (
        <GroupForm
          mode="edit"
          defaultValues={{ name: group.name, description: group.description ?? '' }}
          groupId={group.id}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <Dialog open onOpenChange={(open) => { if (!open) setShowDelete(false) }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete {group.name}?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will remove the group. Splits linked to it will become ad-hoc.
            </p>

            {deleteError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
                {deleteError}
              </p>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Members dialog */}
      {showMembers && (
        <Dialog open onOpenChange={(open) => { if (!open) setShowMembers(false) }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{group.name} — Members</DialogTitle>
            </DialogHeader>

            {membersLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
            ) : (
              <GroupMemberManager
                groupId={group.id}
                currentMembers={members}
                allFriends={friends}
                onRefresh={loadMembers}
              />
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMembers(false)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
