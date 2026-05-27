import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExamsClient } from '@/components/exams/ExamsClient'
import type { ExamItem } from '@/components/exams/ExamsClient'

export default async function ExamsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('exams')
    .select('id, subject, title, exam_type, exam_at, venue, syllabus_text, notes, status')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .order('exam_at', { ascending: true })

  const exams: ExamItem[] = (rows ?? []).map(r => ({
    id: r.id,
    subject: r.subject,
    title: r.title,
    exam_type: r.exam_type,
    exam_at: r.exam_at,
    venue: r.venue,
    syllabus_text: r.syllabus_text,
    notes: r.notes,
    status: r.status as ExamItem['status'],
  }))

  return <ExamsClient initialExams={exams} />
}
