import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/assignments/status-badge'
import { UnarchiveButton } from '@/components/assignments/unarchive-button'
import type { Database } from '@/types/database.types'

type Assignment = Database['public']['Tables']['assignments']['Row']
type Status = 'not_started' | 'in_progress' | 'done'

export default async function ArchivePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('assignments')
    .select('*')
    .eq('user_id', user.id)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })

  const assignments = (data ?? []) as Assignment[]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/assignments" className="text-sm text-muted-foreground hover:underline">
          ← Back to Assignments
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Semester Archive</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {assignments.length === 0 ? 'Nothing here yet' : `${assignments.length} completed assignment${assignments.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">🗂</p>
          <p>Completed assignments will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <Card key={a.id} className="opacity-80">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {a.subject}
                      </span>
                      <StatusBadge status={a.status as Status} />
                    </div>
                    <p className="font-semibold text-sm mt-1">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due: {new Date(a.due_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {a.archived_at && (
                        <> · Completed: {new Date(a.archived_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                      )}
                    </p>
                  </div>
                  <UnarchiveButton id={a.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
