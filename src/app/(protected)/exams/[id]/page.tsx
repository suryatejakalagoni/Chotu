import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { TopicChecklist } from '@/components/exams/topic-checklist'
import { ExamStatusBadge } from '@/components/exams/exam-status-badge'
import { AttachmentUpload } from '@/components/shared/attachment-upload'
import { AttachmentList } from '@/components/shared/attachment-list'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
  })
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: exam },
    { data: topics },
    { data: attachments },
  ] = await Promise.all([
    supabase
      .from('exams')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('exam_topics')
      .select('*')
      .eq('exam_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('exam_attachments')
      .select('*')
      .eq('exam_id', id)
      .eq('user_id', user.id),
  ])

  if (!exam) notFound()

  // Cross-link: completed assignments same subject in last 4 months
  // TODO Day 14: replace rolling 4-month window with user_settings.semester_start
  const since = new Date()
  since.setMonth(since.getMonth() - 4)
  const { data: linkedAssignments } = await supabase
    .from('assignments')
    .select('id, title, subject, due_at')
    .eq('user_id', user.id)
    .eq('status', 'done')
    .ilike('subject', exam.subject)
    .gte('due_at', since.toISOString())
    .is('archived_at', null)
    .order('due_at', { ascending: false })
    .limit(20)

  const days       = daysUntil(exam.exam_at)
  const topicList  = topics ?? []
  const attachList = attachments ?? []
  const revised    = topicList.filter((t) => t.is_revised).length

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Back */}
      <Link href="/exams" className="text-sm text-muted-foreground hover:underline">
        ← Back to Exams
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{exam.subject}</h1>
          {exam.exam_type && (
            <span className="text-sm bg-secondary text-secondary-foreground rounded px-2 py-0.5">
              {exam.exam_type}
            </span>
          )}
          <ExamStatusBadge status={exam.status} />
        </div>

        <p className="text-muted-foreground">{formatDate(exam.exam_at)}</p>

        {exam.status === 'upcoming' && days >= 0 && (
          <p className={`text-sm font-medium ${days <= 3 ? 'text-destructive' : 'text-primary'}`}>
            {days === 0 ? 'Today!' : `${days} day${days !== 1 ? 's' : ''} away`}
          </p>
        )}

        {exam.venue && (
          <p className="text-sm text-muted-foreground">📍 {exam.venue}</p>
        )}
      </div>

      {/* Syllabus */}
      {exam.syllabus_text && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Syllabus</h2>
          <pre className="whitespace-pre-wrap text-sm bg-muted/40 rounded-md p-3 font-sans">
            {exam.syllabus_text}
          </pre>
        </section>
      )}

      {/* Notes */}
      {exam.notes && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Notes</h2>
          <p className="text-sm whitespace-pre-wrap">{exam.notes}</p>
        </section>
      )}

      {/* Topic checklist */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">
          Topics {topicList.length > 0 && `(${revised}/${topicList.length} revised)`}
        </h2>
        <TopicChecklist examId={exam.id} topics={topicList} />
      </section>

      {/* Attachments */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Attachments</h2>
        <AttachmentList attachments={attachList} entityType="exam" />
        <AttachmentUpload
          entityId={exam.id}
          entityType="exam"
          currentCount={attachList.length}
          maxCount={5}
        />
      </section>

      {/* Cross-linked assignments */}
      {(linkedAssignments?.length ?? 0) > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Completed {exam.subject} Assignments</h2>
          <p className="text-xs text-muted-foreground">
            Suggested revision material — completed in the last 4 months.
          </p>
          <ul className="space-y-2">
            {linkedAssignments!.map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm border rounded-md px-3 py-2">
                <span className="font-medium truncate">{a.title}</span>
                <span className="text-xs text-muted-foreground shrink-0 ml-3">
                  {new Date(a.due_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
