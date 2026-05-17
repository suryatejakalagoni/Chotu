'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { reportContent } from '@/lib/actions/community'

interface ReportModalProps {
  targetType: 'post' | 'comment'
  targetId: string
}

export function ReportModal({ targetType, targetId }: ReportModalProps) {
  const [open, setOpen]     = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [done, setDone]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) { setError('Please describe the issue.'); return }
    setLoading(true)
    setError('')
    const result = await reportContent({ target_type: targetType, target_id: targetId, reason })
    if (result.error) {
      setError(result.error)
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
      >
        🚩 Report
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report {targetType}</DialogTitle>
        </DialogHeader>
        {done ? (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">✅</p>
            <p className="font-medium">Report submitted</p>
            <p className="text-sm text-muted-foreground mt-1">
              A moderator will review it shortly.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => { setOpen(false); setDone(false); setReason('') }}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Describe why this should be reviewed or removed…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{reason.length}/500</p>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={loading}>
                {loading ? 'Submitting…' : 'Submit report'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
