import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { globalSearch } from '@/lib/actions/search'
import { TopBar } from '@/components/layout/top-bar'

export const metadata: Metadata = { title: 'Search' }

const FILTERS = [
  { value: 'all',         label: 'All' },
  { value: 'assignments', label: 'Assignments' },
  { value: 'exams',       label: 'Exams' },
  { value: 'expenses',    label: 'Expenses' },
  { value: 'community',   label: 'Community' },
] as const

function fmtAmount(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, is_admin')
    .eq('id', user.id)
    .single()

  const params = await searchParams
  const q      = (params.q ?? '').trim()
  const filter = params.filter ?? 'all'

  const { data: results } = q ? await globalSearch(q, filter) : { data: null }

  const totalCount = results
    ? results.assignments.length + results.exams.length + results.expenses.length + results.community.length
    : 0

  return (
    <div className="min-h-screen bg-background">
      <TopBar isAdmin={profile?.is_admin ?? false} userName={profile?.display_name ?? user.email?.split('@')[0]} />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold">
            {q ? `Results for "${q}"` : 'Search'}
          </h1>
          {q && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalCount === 0 ? 'No results found.' : `${totalCount} result${totalCount !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>

        {/* Filter chips */}
        {q && (
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(({ value, label }) => {
              const href = `/search?q=${encodeURIComponent(q)}&filter=${value}`
              const active = filter === value
              return (
                <Link
                  key={value}
                  href={href}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? 'bg-foreground text-background border-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        )}

        {/* Empty state — no query */}
        {!q && (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Use the search bar above to find assignments, exams, expenses, or community posts.
            </p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-6">
            {/* Assignments */}
            {results.assignments.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
                  Assignments
                </h2>
                <ul className="divide-y rounded-lg border overflow-hidden">
                  {results.assignments.map((a) => (
                    <li key={a.id}>
                      <Link
                        href="/assignments"
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{a.title}</p>
                          <p className="text-xs text-muted-foreground">{a.subject ?? 'No subject'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">Due {fmtDate(a.due_at)}</p>
                          <p className="text-xs capitalize text-muted-foreground">{a.status.replace('_', ' ')}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Exams */}
            {results.exams.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
                  Exams
                </h2>
                <ul className="divide-y rounded-lg border overflow-hidden">
                  {results.exams.map((e) => (
                    <li key={e.id}>
                      <Link
                        href="/exams"
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{e.subject}</p>
                          <p className="text-xs text-muted-foreground">{e.exam_type ?? 'Exam'}</p>
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0">{fmtDate(e.exam_at)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Expenses */}
            {results.expenses.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
                  Expenses
                </h2>
                <ul className="divide-y rounded-lg border overflow-hidden">
                  {results.expenses.map((e) => (
                    <li key={e.id}>
                      <Link
                        href="/expenses"
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors gap-3"
                      >
                        <p className="text-sm font-medium truncate">{e.title}</p>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium text-destructive">{fmtAmount(e.amount)}</p>
                          <p className="text-xs text-muted-foreground">{fmtDate(e.spent_at)}</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Community */}
            {results.community.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-2">
                  Community
                </h2>
                <ul className="divide-y rounded-lg border overflow-hidden">
                  {results.community.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/community/${p.id}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{p.subject_tag ?? 'General'}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 capitalize">
                          {p.content_type.replace('_', ' ')}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* All empty */}
            {totalCount === 0 && q && (
              <div className="rounded-lg border border-dashed p-10 text-center">
                <p className="text-sm font-medium mb-1">Nothing found for &quot;{q}&quot;</p>
                <p className="text-xs text-muted-foreground">
                  Try different keywords or check your spelling.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
