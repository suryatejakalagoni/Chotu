import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatusBadge } from './status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Database } from '@/types/database.types'

type Assignment = Database['public']['Tables']['assignments']['Row']
type Status = 'not_started' | 'in_progress' | 'done'

function formatDue(dueAt: string): string {
  const d = new Date(dueAt)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return 'Today ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (d.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function urgencyCls(dueAt: string): string {
  const diff = new Date(dueAt).getTime() - Date.now()
  if (diff < 0) return 'text-red-600'
  if (diff < 24 * 60 * 60 * 1000) return 'text-orange-600'
  return 'text-muted-foreground'
}

export async function AssignmentsDashboardWidget() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const now           = new Date()
  const threeDaysOut  = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const { data } = await supabase
    .from('assignments')
    .select('id, title, subject, due_at, status, priority')
    .eq('user_id', user.id)
    .is('archived_at', null)
    .neq('status', 'done')
    .gte('due_at', now.toISOString())
    .lte('due_at', threeDaysOut.toISOString())
    .order('due_at', { ascending: true })

  const assignments = (data ?? []) as Assignment[]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Due Soon</span>
          <Link href="/assignments" className="text-xs text-muted-foreground hover:underline font-normal">
            View all →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments due in the next 3 days 🎉</p>
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.subject}</p>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <p className={`text-xs ${urgencyCls(a.due_at)}`}>{formatDue(a.due_at)}</p>
                  <StatusBadge status={a.status as Status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
