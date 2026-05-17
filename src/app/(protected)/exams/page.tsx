import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExamList } from '@/components/exams/exam-list'
import { ExamFilters } from '@/components/exams/exam-filters'
import { AddExamButton } from '@/components/exams/add-exam-button'
import { getDistinctExamTypes } from '@/lib/actions/exams'

interface SearchParams {
  subject?:   string
  exam_type?: string
  from?:      string
  to?:        string
  sort?:      string
}

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const filters   = await searchParams
  const examTypes = await getDistinctExamTypes()

  let query = supabase
    .from('exams')
    .select('*')
    .eq('user_id', user.id)
    .is('archived_at', null)

  if (filters.subject) {
    query = query.ilike('subject', `%${filters.subject}%`)
  }
  if (filters.exam_type) {
    query = query.ilike('exam_type', `%${filters.exam_type}%`)
  }
  if (filters.from) {
    query = query.gte('exam_at', new Date(filters.from).toISOString())
  }
  if (filters.to) {
    const to = new Date(filters.to)
    to.setHours(23, 59, 59, 999)
    query = query.lte('exam_at', to.toISOString())
  }

  const sort = filters.sort ?? 'exam_asc'
  if (sort === 'exam_asc')     query = query.order('exam_at',  { ascending: true  })
  if (sort === 'exam_desc')    query = query.order('exam_at',  { ascending: false })
  if (sort === 'subject_asc')  query = query.order('subject',  { ascending: true  })

  const { data: exams } = await query

  const ids = (exams ?? []).map((e) => e.id)

  const { data: topics } = ids.length
    ? await supabase
        .from('exam_topics')
        .select('*')
        .in('exam_id', ids)
        .eq('user_id', user.id)
    : { data: [] }

  const total    = exams?.length ?? 0
  const upcoming = exams?.filter((e) => e.status === 'upcoming').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Exams</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total === 0 ? 'No exams' : `${upcoming} upcoming · ${total} total`}
          </p>
        </div>
        <AddExamButton examTypes={examTypes} />
      </div>

      <ExamFilters examTypes={examTypes} />

      <ExamList
        exams={exams ?? []}
        topics={topics ?? []}
        examTypes={examTypes}
      />
    </div>
  )
}
