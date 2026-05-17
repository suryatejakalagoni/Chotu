'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { FriendForm } from './friend-form'
import { deleteFriend } from '@/lib/actions/friends'
import { formatRupees } from '@/lib/split-utils'
import type { FriendWithBalance } from '@/types/splits'

interface FriendCardProps {
  friend: FriendWithBalance
}

export function FriendCard({ friend }: FriendCardProps) {
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isRemoved = Boolean(friend.deleted_at)

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteFriend(friend.id)
    setDeleting(false)

    if (result.error) {
      setDeleteError(result.error)
      return
    }

    if (result.hasOpenSplits) {
      setDeleteMessage('Friend removed. Their open splits are preserved.')
      setTimeout(() => setShowDelete(false), 1500)
      return
    }

    setShowDelete(false)
  }

  return (
    <>
      <Card className={isRemoved ? 'opacity-60' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm truncate">{friend.name}</span>
                {isRemoved && (
                  <span className="text-xs text-muted-foreground">(removed)</span>
                )}
                {friend.total_owed > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5">
                    {formatRupees(friend.total_owed)} owed
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5">
                    Settled
                  </span>
                )}
              </div>
              {friend.email && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {friend.email}
                </p>
              )}
            </div>

            {!isRemoved && (
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowEdit(true)}
                  aria-label="Edit friend"
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
                  aria-label="Delete friend"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showEdit && (
        <FriendForm
          mode="edit"
          defaultValues={{ name: friend.name, email: friend.email ?? '' }}
          friendId={friend.id}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <Dialog open onOpenChange={(open) => { if (!open) setShowDelete(false) }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete {friend.name}?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Their split history will be kept.
            </p>

            {deleteError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
                {deleteError}
              </p>
            )}

            {deleteMessage && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
                {deleteMessage}
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
                {deleting ? 'Removing…' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
