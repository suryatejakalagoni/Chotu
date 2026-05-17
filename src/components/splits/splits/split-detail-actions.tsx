'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SplitForm } from './split-form'
import { deleteSplit } from '@/lib/actions/splits'
import type { SplitWithShares } from '@/types/splits'

interface SplitDetailActionsProps {
  split: SplitWithShares
  friends: Array<{ id: string; name: string }>
  groups: Array<{ id: string; name: string }>
}

export function SplitDetailActions({ split, friends, groups }: SplitDetailActionsProps) {
  const router = useRouter()
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteSplit(split.id)
    setDeleting(false)

    if (result.error) {
      setDeleteError(result.error)
      return
    }

    router.push('/splits')
  }

  return (
    <>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-500 border-red-200 hover:bg-red-50"
          onClick={() => setShowDelete(true)}
        >
          Delete
        </Button>
      </div>

      {showEdit && (
        <SplitForm
          mode="edit"
          defaultValues={split}
          friends={friends}
          groups={groups}
          onClose={() => {
            setShowEdit(false)
            router.refresh()
          }}
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
