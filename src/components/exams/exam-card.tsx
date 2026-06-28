'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteExam, archiveExam, updateExamStatus } from '@/lib/actions/exams'
import { ExamStatusBadge } from './exam-status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Database } from '@/types/database.types'

type Exam = Database['public']['Tables']['exams']['Row']

interface TopicSummary {
  total:   number
  revised: number
}

interface Props {
  exam:         Exam
  topicSummary: TopicSummary
  onEdit:       (exam: Exam) => void
}

function daysUntil(isoDate: string): number {
  const diff = new Date(isoDate).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

export function ExamCard({ exam, topicSummary, onEdit }: Props) {
  const [isPending, startTrans]     = useTransition()
  const [confirmDelete, setConfirm] = useState(false)

  const days    = daysUntil(exam.exam_at)
  const expired = days < 0

  function handleDelete() {
    if (!confirmDelete) { setConfirm(true); return }
    startTrans(async () => { await deleteExam(exam.id) })
  }

  function handleArchive() {
    startTrans(async () => { await archiveExam(exam.id) })
  }

  function handleStatusCycle() {
    const next = exam.status === 'upcoming'
      ? 'completed'
      : exam.status === 'completed'
        ? 'cancelled'
        : 'upcoming'
    startTrans(async () => { await updateExamStatus({ id: exam.id, status: next }) })
  }

  return (
    <Card className={`transition-opacity ${isPending ? 'opacity-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: subject + type + date */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/exams/${exam.id}`}
                className="font-semibold hover:underline truncate"
              >
                {exam.subject}
              </Link>
              <ExamStatusBadge status={exam.status} />
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
              <span>{formatDate(exam.exam_at)}</span>
              {!expired && exam.status === 'upcoming' && (
                <span className={`font-medium ${days <= 3 ? 'text-destructive' : ''}`}>
                  {days === 0 ? 'Today!' : `${days}d left`}
                </span>
              )}
              {exam.location && <span>📍 {exam.location}</span>}
            </div>

            {/* Topic progress */}
            {topicSummary.total > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((topicSummary.revised / topicSummary.total) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {topicSummary.revised}/{topicSummary.total} topics
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={isPending}
              onClick={handleStatusCycle}
              title="Cycle status"
            >
              ↻
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={isPending}
              onClick={() => onEdit(exam)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={isPending}
              onClick={handleArchive}
            >
              Archive
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 text-xs ${confirmDelete ? 'text-destructive' : ''}`}
              disabled={isPending}
              onClick={handleDelete}
              onBlur={() => setConfirm(false)}
            >
              {confirmDelete ? 'Confirm' : 'Delete'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
