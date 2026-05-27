import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AssignmentsClient } from '@/components/assignments/AssignmentsClient'
import type { AssignmentItem } from '@/components/assignments/AssignmentsClient'

export default async function AssignmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('assignments')
    .select('id, subject, title, description, due_at, estimated_minutes, status, priority, archived_at')
    .eq('user_id', user.id)
    .order('due_at', { ascending: true })

  const assignments: AssignmentItem[] = (rows ?? []).map(r => ({
    id: r.id,
    subject: r.subject,
    title: r.title,
    description: r.description,
    due_at: r.due_at,
    estimated_minutes: r.estimated_minutes,
    status: r.status as 'not_started' | 'in_progress' | 'done',
    priority: r.priority as 'low' | 'medium' | 'high',
    progress: r.status === 'done' ? 100 : 0,
    archived_at: r.archived_at,
  }))

  return <AssignmentsClient initialAssignments={assignments} />
}
