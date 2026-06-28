// RETIRED — Bunk no longer uses stored semesters (portal-snapshot model now).
// Un-comment the block below to restore the semester setup screen.
import { notFound } from 'next/navigation'
export default function BunkSetupPage() { return notFound() }

/*
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSemesterData } from '@/lib/actions/bunk'
import { SemesterSetupClient } from '@/components/bunk/SemesterSetupClient'

export const dynamic = 'force-dynamic'

export default async function BunkSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const { id } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Editing an existing semester → preload its data. Otherwise blank create.
  let initial:
    | {
        semester: {
          id: string
          name: string
          start_date: string
          end_date: string
          target_pct: number
          condonation_floor_pct: number
        }
        slots: {
          id: string
          semester_id: string
          day_of_week: number
          period_no: number
          subject: string | null
        }[]
        holidays: {
          id: string
          semester_id: string
          holiday_date: string
          label: string | null
        }[]
      }
    | null = null

  if (id) {
    const data = await getSemesterData(id)
    if (!('error' in data) && data.semester) {
      initial = {
        semester: data.semester,
        slots: data.slots,
        holidays: data.holidays,
      }
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <SemesterSetupClient initial={initial} />
    </main>
  )
}
*/
