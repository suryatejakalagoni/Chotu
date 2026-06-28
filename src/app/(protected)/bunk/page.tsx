import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BunkCalculator } from '@/components/bunk/BunkCalculator'

export const dynamic = 'force-dynamic'

export default async function BunkPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <BunkCalculator />
}

/*
 * RETIRED — the old DB-backed semester hub. The bunk feature now uses a portal
 * snapshot (Present/Total typed off iLMS) projected against a fixed Section-H
 * timetable; there are no saved semesters to list. Kept here, commented, in
 * case the multi-semester model is revived. getSemesters / actions/bunk.ts /
 * calc.ts / mapToEngine.ts all remain on disk.
 *
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSemesters } from '@/lib/actions/bunk'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const _FMT = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return _FMT.format(new Date(Date.UTC(y, m - 1, d)))
}

export default async function BunkHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { semesters } = await getSemesters()

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="font-heading text-xl font-semibold">Bunk Calculator</h1>
          <p className="text-sm text-muted-foreground">
            Track attendance and how many classes you can safely skip.
          </p>
        </div>
        <Link href="/bunk/setup" className={cn(buttonVariants(), 'h-9 whitespace-nowrap')}>
          + New
        </Link>
      </div>

      {semesters.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              No semesters yet. Create one to set your timetable and start
              tracking.
            </p>
            <Link href="/bunk/setup" className={cn(buttonVariants(), 'h-9')}>
              Create your first semester
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {semesters.map((s) => (
            <Card key={s.id} size="sm">
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtDate(s.start_date)} – {fmtDate(s.end_date)} · target{' '}
                      {Number(s.target_pct)}%
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/bunk/${s.id}`}
                    className={cn(buttonVariants({ size: 'sm' }))}
                  >
                    Calculator
                  </Link>
                  <Link
                    href={`/bunk/${s.id}/absent`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    Mark absent
                  </Link>
                  <Link
                    href={`/bunk/setup?id=${s.id}`}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
                  >
                    Edit
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  )
}
*/
