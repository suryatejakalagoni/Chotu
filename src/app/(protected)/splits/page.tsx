import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFriendsWithBalance } from '@/lib/actions/friends'
import { getSplitsWithShares } from '@/lib/actions/splits'
import { SplitsClient } from '@/components/splits/SplitsClient'

export const metadata: Metadata = { title: 'Splits — CHOTU' }

export default async function SplitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ friends }, { splits }] = await Promise.all([
    getFriendsWithBalance(),
    getSplitsWithShares(),
  ])

  return (
    <SplitsClient
      initialSplits={splits}
      initialFriends={friends}
    />
  )
}
