// RETIRED — per-semester calculator (portal-snapshot model now lives at /bunk).
// Un-comment the block below to restore.
import { notFound } from 'next/navigation'
export default function BunkCalculatorPage() { return notFound() }

/*
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSemesterData } from '@/lib/actions/bunk'
import { mapToEngine } from '@/lib/bunk/mapToEngine'
import { computeBunk } from '@/lib/bunk/calc'
import { BunkResultView } from '@/components/bunk/BunkResultView'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function todayIST(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(
    new Date(),
  )
}

export default async function BunkCalculatorPage({
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

  // DB rows → engine input → BunkResult. All pure; computed on the server.
  const input = mapToEngine({
    semester: data.semester,
    slots: data.slots,
    holidays: data.holidays,
    missed: data.missed,
    referenceDate: todayIST(),
  })
  const result = computeBunk(input)

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <Link
        href="/bunk"
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        ← All semesters
      </Link>
      <BunkResultView
        result={result}
        semesterId={data.semester.id}
        semesterName={data.semester.name}
        targetPct={Number(data.semester.target_pct)}
        floorPct={Number(data.semester.condonation_floor_pct)}
      />
    </main>
  )
}
*/
