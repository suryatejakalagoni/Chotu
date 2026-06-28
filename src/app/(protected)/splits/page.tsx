// HIDDEN — Splits feature parked. Un-comment the block below to restore.
import { notFound } from 'next/navigation'
export default function SplitsPage() { return notFound() }

/*
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSplitsWithShares } from '@/lib/actions/splits'
import { getFriendsWithBalance } from '@/lib/actions/friends'
import { SplitsClient } from '@/components/splits/SplitsClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Expense Splits — CHOTU' }

export default async function SplitsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ splits }, { friends }] = await Promise.all([
    getSplitsWithShares(),
    getFriendsWithBalance(),
  ])

  return <SplitsClient initialSplits={splits} initialFriends={friends} />
}
*/
