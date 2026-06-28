// RETIRED — manual absence logging (portal-snapshot model needs no per-slot log).
// Un-comment the block below to restore.
import { notFound } from 'next/navigation'
export default function MarkAbsentPage() { return notFound() }

/*
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSemesterData } from '@/lib/actions/bunk'
import { MarkAbsentClient } from '@/components/bunk/MarkAbsentClient'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function todayIST(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(
    new Date(),
  )
}

export default async function MarkAbsentPage({
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

  const data = await getSemesterData(id)

  if ('error' in data || !data.semester) {
    return (
      <main className="mx-auto max-w-md px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          {('error' in data && data.error) || 'Semester not found.'}
        </p>
        <Link href="/bunk" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4 h-9')}>
          Back to semesters
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <MarkAbsentClient
        semesterId={data.semester.id}
        semesterName={data.semester.name}
        startDate={data.semester.start_date.slice(0, 10)}
        endDate={data.semester.end_date.slice(0, 10)}
        today={todayIST()}
        slots={data.slots}
      />
    </main>
  )
}
*/
