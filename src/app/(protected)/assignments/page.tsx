import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AssignmentList } from '@/components/assignments/assignment-list'
import { AssignmentFilters } from '@/components/assignments/assignment-filters'
import { AddAssignmentButton } from '@/components/assignments/add-assignment-button'
import Link from 'next/link'

interface SearchParams {
  status?:  string
  subject?: string
  from?:    string
  to?:      string
  sort?:    string
}

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const filters = await searchParams

  let query = supabase
    .from('assignments')
    .select('*')
    .eq('user_id', user.id)
    .is('archived_at', null) // main view = active only

  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status as 'not_started' | 'in_progress' | 'done')
  }
  if (filters.subject) {
    query = query.ilike('subject', `%${filters.subject}%`)
  }
  if (filters.from) {
    query = query.gte('due_at', new Date(filters.from).toISOString())
  }
  if (filters.to) {
    // Include the whole 'to' day
    const to = new Date(filters.to)
    to.setHours(23, 59, 59, 999)
    query = query.lte('due_at', to.toISOString())
  }

  const sort = filters.sort ?? 'due_asc'
  if (sort === 'due_asc')     query = query.order('due_at',  { ascending: true  })
  if (sort === 'due_desc')    query = query.order('due_at',  { ascending: false })
  if (sort === 'subject_asc') query = query.order('subject', { ascending: true  })
  if (sort === 'status_asc')  query = query.order('status',  { ascending: true  })

  const { data: assignments } = await query

  const ids = (assignments ?? []).map((a) => a.id)

  const [{ data: attachments }, { data: completions }] = await Promise.all([
    ids.length
      ? supabase
          .from('assignment_attachments')
          .select('*')
          .in('assignment_id', ids)
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
    // Only fetch completions for recurring assignments (this week ± 8 days)
    ids.length
      ? supabase
          .from('recurring_completions')
          .select('*')
          .in('assignment_id', ids)
          .eq('user_id', user.id)
      : Promise.resolve({ data: [] }),
  ])

  const total   = assignments?.length ?? 0
  const notDone = assignments?.filter((a) => a.status !== 'done').length ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total === 0 ? 'No assignments' : `${notDone} pending · ${total} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/assignments/archive"
            className="text-sm text-muted-foreground hover:underline"
          >
            Archive →
          </Link>
          <AddAssignmentButton />
        </div>
      </div>

      {/* Filters */}
      <AssignmentFilters />

      {/* List */}
      <AssignmentList
        assignments={assignments ?? []}
        attachments={attachments ?? []}
        completions={completions ?? []}
      />
    </div>
  )
}
