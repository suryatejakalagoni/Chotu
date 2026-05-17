'use client'

import { useState } from 'react'
import {
  transitionStatus,
  deleteAssignment,
  completeRecurringOccurrence,
  uncompleteRecurringOccurrence,
} from '@/lib/actions/assignments'
import { getThisWeekOccurrenceDate, describeRRule } from '@/lib/assignment-utils'
import { StatusBadge } from './status-badge'
import { AttachmentList } from './attachment-list'
import { AttachmentUpload } from './attachment-upload'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Database } from '@/types/database.types'

type Assignment  = Database['public']['Tables']['assignments']['Row']
type Attachment  = Database['public']['Tables']['assignment_attachments']['Row']
type Completion  = { occurrence_date: string }

type Status = 'not_started' | 'in_progress' | 'done'

const PRIORITY_LABEL: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High' }
const PRIORITY_CLS: Record<string, string>   = {
  low:    'text-slate-500',
  medium: 'text-amber-600',
  high:   'text-red-600',
}

function urgencyClass(dueAt: string): string {
  const diff = new Date(dueAt).getTime() - Date.now()
  if (diff < 0) return 'text-red-600 font-semibold'
  if (diff < 24 * 60 * 60 * 1000) return 'text-orange-600 font-semibold'
  if (diff < 3  * 24 * 60 * 60 * 1000) return 'text-amber-600'
  return 'text-muted-foreground'
}

function formatDue(dueAt: string): string {
  const d = new Date(dueAt)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return 'Today ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  assignment:   Assignment
  attachments:  Attachment[]
  completions?: Completion[]  // recurring_completions for this assignment
  onEdit: (a: Assignment) => void
}

export function AssignmentCard({ assignment: a, attachments, completions = [], onEdit }: Props) {
  const [busy, setBusy]           = useState(false)
  const [expanded, setExpanded]   = useState(false)
  const [actionErr, setActionErr] = useState<string | null>(null)

  // Recurring: compute this week's occurrence date and whether it's done
  const thisWeekDate = a.is_recurring && a.recurrence_rule
    ? getThisWeekOccurrenceDate(a.recurrence_rule)
    : null
  const thisWeekDone = thisWeekDate
    ? completions.some((c) => c.occurrence_date === thisWeekDate)
    : false

  async function handleTransition(status: Status) {
    setBusy(true)
    setActionErr(null)
    const result = await transitionStatus({ id: a.id, status })
    setBusy(false)
    if (result.error) setActionErr(result.error)
  }

  async function handleCompleteOccurrence() {
    if (!thisWeekDate) return
    setBusy(true)
    setActionErr(null)
    const result = thisWeekDone
      ? await uncompleteRecurringOccurrence(a.id, thisWeekDate)
      : await completeRecurringOccurrence(a.id, thisWeekDate)
    setBusy(false)
    if (result.error) setActionErr(result.error)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return
    setBusy(true)
    const result = await deleteAssignment(a.id)
    setBusy(false)
    if (result.error) setActionErr(result.error)
  }

  const isOverdue = new Date(a.due_at) < new Date() && a.status !== 'done' && !a.is_recurring

  return (
    <Card className={`transition-opacity ${busy ? 'opacity-60 pointer-events-none' : ''}`}>
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {a.subject}
              </span>
              {a.is_recurring ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                  ↻ {a.recurrence_rule ? describeRRule(a.recurrence_rule) : 'Weekly'}
                </span>
              ) : (
                <StatusBadge status={a.status as Status} />
              )}
              <span className={`text-xs font-medium ${PRIORITY_CLS[a.priority]}`}>
                {PRIORITY_LABEL[a.priority]}
              </span>
              {isOverdue && (
                <span className="text-xs font-semibold text-red-600 border border-red-300 rounded-full px-2 py-0.5">
                  Overdue
                </span>
              )}
              {a.is_recurring && thisWeekDone && (
                <span className="text-xs font-semibold text-green-700 border border-green-300 rounded-full px-2 py-0.5">
                  ✓ This week done
                </span>
              )}
            </div>
            <p className="font-semibold text-sm mt-1 truncate">{a.title}</p>
            <p className={`text-xs mt-0.5 ${urgencyClass(a.due_at)}`}>
              Due: {formatDue(a.due_at)}
              {a.estimated_minutes && (
                <span className="ml-2 text-muted-foreground">· ~{a.estimated_minutes} min</span>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => onEdit(a)}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Description (truncated) */}
        {a.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{a.description}</p>
        )}

        {/* Status transition buttons */}
        {a.is_recurring ? (
          // Recurring: mark just this week's occurrence
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className={`h-8 text-xs ${
                thisWeekDone
                  ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  : 'border-green-300 text-green-700 hover:bg-green-50'
              }`}
              onClick={handleCompleteOccurrence}
            >
              {thisWeekDone ? '↩ Undo this week' : '✓ Complete this week'}
            </Button>
          </div>
        ) : a.status !== 'done' ? (
          // Non-recurring: standard transitions
          <div className="flex gap-2 flex-wrap">
            {a.status === 'not_started' && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={() => handleTransition('in_progress')}
              >
                → Start
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => handleTransition('done')}
            >
              ✓ Mark Done
            </Button>
          </div>
        ) : null}

        {actionErr && <p className="text-xs text-destructive">{actionErr}</p>}

        {/* Expand for notes + attachments */}
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => setExpanded((x) => !x)}
        >
          {expanded ? 'Hide details' : `Show details${attachments.length > 0 ? ` · ${attachments.length} file${attachments.length > 1 ? 's' : ''}` : ''}`}
        </button>

        {expanded && (
          <div className="space-y-3 pt-1 border-t">
            {a.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{a.notes}</p>
              </div>
            )}
            <AttachmentList attachments={attachments} />
            <AttachmentUpload
              assignmentId={a.id}
              currentCount={attachments.length}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
