'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useVoiceStore } from '@/store/voice-store'
import { processVoiceEntry } from '@/lib/actions/voice'
import { parseVoice, formatVoiceDate, formatVoiceDateTime, spendingRangeLabel } from '@/lib/voice-parser'
import type { ParsedAction } from '@/lib/voice-parser'

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const styles = {
    high:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  }
  return (
    <span className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[level]}`}>
      {level === 'high' ? 'High confidence' : level === 'medium' ? 'Check details' : 'Low confidence'}
    </span>
  )
}

// ─── Parsed action preview ────────────────────────────────────────────────────

function ActionPreview({ action }: { action: ParsedAction }) {
  switch (action.kind) {
    case 'expense':
      return (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              Add expense —{' '}
              ₹{action.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {action.description} · {action.category_name}
            </p>
          </div>
          <ConfidenceBadge level={action.confidence} />
        </div>
      )

    case 'income':
      return (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              Add income —{' '}
              ₹{action.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {action.source ? `${action.source} · ` : ''}{action.category_name}
            </p>
          </div>
          <ConfidenceBadge level={action.confidence} />
        </div>
      )

    case 'assignment':
      return (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Add assignment</p>
            <p className="text-xs text-muted-foreground truncate">{action.title}</p>
            <p className="text-xs text-muted-foreground">
              Due: {formatVoiceDate(action.due_at)}
            </p>
          </div>
          <ConfidenceBadge level={action.confidence} />
        </div>
      )

    case 'exam':
      return (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Add exam</p>
            <p className="text-xs text-muted-foreground truncate">
              {action.subject} — {action.exam_type}
            </p>
            <p className="text-xs text-muted-foreground">
              On: {formatVoiceDateTime(action.exam_at)}
            </p>
          </div>
          <ConfidenceBadge level={action.confidence} />
        </div>
      )

    case 'attendance_placeholder':
      return (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Mark attendance</p>
            <p className="text-xs text-muted-foreground">{action.subject}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Attendance tracker coming soon
            </p>
          </div>
          <span className="ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            Placeholder
          </span>
        </div>
      )

    case 'query_spending':
      return (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Spending query</p>
            <p className="text-xs text-muted-foreground">
              {spendingRangeLabel(action.range)}
              {action.category_name ? ` · ${action.category_name}` : ''}
            </p>
          </div>
          <span className="ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400">
            Query
          </span>
        </div>
      )

    case 'custom_reminder':
      return (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Set reminder</p>
            <p className="text-xs text-muted-foreground truncate">{action.text}</p>
            <p className="text-xs text-muted-foreground">
              At: {formatVoiceDateTime(action.trigger_at)}
            </p>
          </div>
          <ConfidenceBadge level={action.confidence} />
        </div>
      )

    case 'unknown':
      return (
        <div>
          <p className="text-sm text-muted-foreground">
            Didn&apos;t understand.{' '}
            <span className="text-foreground font-medium">Try one of these:</span>
          </p>
          <ul className="mt-1.5 space-y-0.5">
            {[
              '"Spent 150 on lunch"',
              '"Received 500 from dad"',
              '"Maths assignment due Friday"',
              '"Chemistry exam next Thursday at 10am"',
              '"How much did I spend this week?"',
            ].map((ex) => (
              <li key={ex} className="text-xs text-muted-foreground pl-2 border-l-2 border-muted">
                {ex}
              </li>
            ))}
          </ul>
        </div>
      )
  }
}

// ─── Confirm button label ─────────────────────────────────────────────────────

function confirmLabel(action: ParsedAction | null, isPending: boolean): string {
  if (isPending) return 'Saving…'
  if (!action) return 'Confirm'
  switch (action.kind) {
    case 'query_spending':        return 'Show'
    case 'attendance_placeholder':return 'OK'
    default:                      return 'Confirm'
  }
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export function VoiceModal() {
  const {
    status,
    parsedAction,
    editedTranscript,
    queryResult,
    infoMessage,
    setStatus,
    setEditedTranscript,
    setParsedAction,
    setLastConfirmedEntryId,
    setQueryResult,
    setInfoMessage,
    reset,
  } = useVoiceStore()

  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const isOpen = status === 'confirming'

  const handleTranscriptChange = (value: string) => {
    setEditedTranscript(value)
    setParsedAction(parseVoice(value))
    setServerError(null)
  }

  const handleConfirm = () => {
    if (isPending) return
    setServerError(null)

    startTransition(async () => {
      const result = await processVoiceEntry(editedTranscript)

      if (result.error) {
        setServerError(result.error)
        return
      }

      // Spending query: show result inline, keep modal open
      if (result.queryResult) {
        setQueryResult(result.queryResult)
        return
      }

      // Attendance placeholder: show info message inline, keep modal open
      if (result.infoMessage) {
        setInfoMessage(result.infoMessage)
        return
      }

      // Normal success: close modal
      setLastConfirmedEntryId(result.id ?? null)
      setStatus('done')
    })
  }

  const handleClose = () => {
    if (isPending) return
    reset()
  }

  // If query result is in — show summary card, no further confirm
  if (isOpen && queryResult) {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) handleClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Spending summary</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border p-4 bg-muted/40 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              {queryResult.label}{queryResult.category ? ` · ${queryResult.category}` : ''}
            </p>
            <p className="text-2xl font-bold">
              ₹{queryResult.total.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground">
              {queryResult.count} {queryResult.count === 1 ? 'transaction' : 'transactions'}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // If info message is in (attendance placeholder)
  if (isOpen && infoMessage) {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) handleClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Voice entry saved</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3">
            <p className="text-sm text-amber-800 dark:text-amber-300">{infoMessage}</p>
          </div>
          <DialogFooter>
            <Button onClick={handleClose}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const isActionable = parsedAction !== null && parsedAction.kind !== 'unknown'

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm voice entry</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Editable transcript */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              What we heard
            </label>
            <Textarea
              className="mt-1.5 text-sm resize-none"
              rows={2}
              value={editedTranscript}
              onChange={(e) => handleTranscriptChange(e.target.value)}
              placeholder="Edit if needed…"
              maxLength={500}
              disabled={isPending}
            />
          </div>

          {/* Parsed action preview */}
          <div className="rounded-md border p-3 bg-muted/40">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Action
            </p>
            {parsedAction ? (
              <ActionPreview action={parsedAction} />
            ) : (
              <p className="text-sm text-muted-foreground">Listening for a command…</p>
            )}
          </div>

          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isActionable || isPending}
          >
            {confirmLabel(parsedAction, isPending)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
