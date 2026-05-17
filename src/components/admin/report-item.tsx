'use client'

import { useState } from 'react'
import type { ReportWithTarget } from '@/types/community'
import { resolveReport, adminDeletePost, adminDeleteComment } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface ReportItemProps {
  report: ReportWithTarget
}

export function ReportItem({ report }: ReportItemProps) {
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  async function act(action: 'dismiss' | 'delete') {
    setLoading(true)
    setError('')
    let result: { error?: string }

    if (action === 'dismiss') {
      result = await resolveReport(report.id)
    } else {
      result = report.post_id
        ? await adminDeletePost(report.post_id, report.id)
        : await adminDeleteComment(report.comment_id!, report.id)
    }

    if (result.error) {
      setError(result.error)
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="rounded-lg border p-4 opacity-40">
        <p className="text-sm text-muted-foreground">Resolved ✓</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Target info */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 flex-1 min-w-0">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            {report.comment_id ? 'Comment' : 'Post'}
          </p>
          <p className="text-sm font-medium truncate">{report.target_title ?? '—'}</p>
          <p className="text-xs text-muted-foreground">
            by <span className="font-medium">{report.target_author ?? 'Unknown'}</span>
          </p>
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      {/* Report reason */}
      <div className="bg-muted/50 rounded p-2">
        <p className="text-xs text-muted-foreground mb-0.5">
          Reported by <span className="font-medium">{report.reporter_name}</span>:
        </p>
        <p className="text-sm">{report.reason}</p>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => act('dismiss')}
        >
          Dismiss
        </Button>
        <Button
          size="sm"
          variant="destructive"
          disabled={loading}
          onClick={() => act('delete')}
        >
          Delete {report.comment_id ? 'comment' : 'post'}
        </Button>
      </div>
    </div>
  )
}
