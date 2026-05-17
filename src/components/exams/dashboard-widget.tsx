import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day:   'numeric',
    month: 'short',
  })
}

export async function ExamsDashboardWidget() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: exams } = await supabase
    .from('exams')
    .select('id, subject, exam_type, exam_at, venue, status')
    .eq('user_id', user.id)
    .eq('status', 'upcoming')
    .is('archived_at', null)
    .gte('exam_at', new Date().toISOString())
    .order('exam_at', { ascending: true })
    .limit(3)

  const list = exams ?? []

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Upcoming Exams</CardTitle>
          <Link href="/exams" className="text-xs text-muted-foreground hover:underline">
            View all →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming exams.</p>
        ) : (
          <ul className="space-y-2">
            {list.map((exam) => {
              const days = daysUntil(exam.exam_at)
              return (
                <li key={exam.id} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <Link href={`/exams/${exam.id}`} className="font-medium hover:underline truncate block">
                      {exam.subject}
                      {exam.exam_type ? ` · ${exam.exam_type}` : ''}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatShortDate(exam.exam_at)}</p>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ml-3 ${days <= 3 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {days === 0 ? 'Today!' : `${days}d`}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
