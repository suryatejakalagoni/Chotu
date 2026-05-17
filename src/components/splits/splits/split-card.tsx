'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SettleButton } from './settle-button'
import { SplitForm } from './split-form'
import { deleteSplit } from '@/lib/actions/splits'
import { formatRupees, toPaise, toRupees } from '@/lib/split-utils'
import type { SplitWithShares, FriendWithBalance, GroupWithBalance } from '@/types/splits'

interface SplitCardProps {
  split: SplitWithShares
  friends: Array<{ id: string; name: string }>
  groups: Array<{ id: string; name: string }>
}

export function SplitCard({ split, friends, groups }: SplitCardProps) {
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const pendingTotal = toRupees(
    split.shares
      .filter((sh) => !sh.is_settled)
      .reduce((s, sh) => s + toPaise(sh.amount_owed), 0)
  )
  const settledTotal = toRupees(
    split.shares
      .filter((sh) => sh.is_settled)
      .reduce((s, sh) => s + toPaise(sh.amount_owed), 0)
  )

  const formattedDate = new Date(split.paid_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteSplit(split.id)
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
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{split.title}</span>
                {split.group_name && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 text-xs px-2 py-0.5">
                    {split.group_name}
                  </span>
                )}
                <span
                  className={`inline-flex items-center rounded-full text-xs px-2 py-0.5 font-medium ${
                    split.status === 'settled'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {split.status === 'settled' ? 'Settled' : 'Pending'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{formattedDate}</p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowEdit(true)}
                aria-label="Edit split"
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
                aria-label="Delete split"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Shares */}
          <div className="space-y-1.5">
            {split.shares.map((sh) => (
              <div
                key={sh.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className={sh.is_settled ? 'text-muted-foreground line-through' : ''}>
                  {sh.friend_name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatRupees(sh.amount_owed)}</span>
                  <SettleButton
                    shareId={sh.id}
                    isSettled={sh.is_settled}
                    friendName={sh.friend_name}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Footer summary */}
          <div className="pt-1 border-t text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
            <span>{formatRupees(split.total_amount)} total</span>
            {pendingTotal > 0 && (
              <span className="text-orange-600">{formatRupees(pendingTotal)} pending</span>
            )}
            {settledTotal > 0 && (
              <span className="text-green-600">{formatRupees(settledTotal)} settled</span>
            )}
          </div>
        </CardContent>
      </Card>

      {showEdit && (
        <SplitForm
          mode="edit"
          defaultValues={split}
          friends={friends}
          groups={groups}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && (
        <Dialog open onOpenChange={(open) => { if (!open) setShowDelete(false) }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete split?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              &ldquo;{split.title}&rdquo; will be permanently deleted.
            </p>

            {deleteError && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
                {deleteError}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
