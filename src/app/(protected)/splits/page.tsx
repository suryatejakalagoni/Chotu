import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getFriendsWithBalance } from '@/lib/actions/friends'
import { getGroupsWithBalance } from '@/lib/actions/groups'
import { getSplitsWithShares, getTotalOwed } from '@/lib/actions/splits'
import { SplitList } from '@/components/splits/splits/split-list'
import { FriendList } from '@/components/splits/friends/friend-list'
import { GroupList } from '@/components/splits/groups/group-list'
import { BalanceSummary } from '@/components/splits/splits/balance-summary'
export const metadata: Metadata = { title: 'Splits — CHOTU' }

type Tab = 'splits' | 'friends' | 'groups' | 'balances'

const TABS: { value: Tab; label: string }[] = [
  { value: 'splits', label: 'Splits' },
  { value: 'friends', label: 'Friends' },
  { value: 'groups', label: 'Groups' },
  { value: 'balances', label: 'Balances' },
]

interface PageProps {
  searchParams: Promise<{
    tab?: string
    status?: string
    friend_id?: string
    group_id?: string
  }>
}

export default async function SplitsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const activeTab: Tab =
    params.tab === 'friends' || params.tab === 'groups' || params.tab === 'balances'
      ? params.tab
      : 'splits'

  const statusFilter =
    params.status === 'pending' || params.status === 'settled'
      ? params.status
      : undefined

  // Fetch data server-side
  const [{ friends }, { groups }, { splits }, totalOwed] = await Promise.all([
    getFriendsWithBalance(),
    getGroupsWithBalance(),
    getSplitsWithShares({
      status: statusFilter,
      friend_id: params.friend_id,
      group_id: params.group_id,
    }),
    getTotalOwed(),
  ])

  const buildTabUrl = (tab: Tab) => {
    const q = new URLSearchParams({ tab })
    return `/splits?${q.toString()}`
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <h1 className="text-2xl font-bold">Splits</h1>

        {/* Tab navigation */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg w-full overflow-x-auto">
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              href={buildTabUrl(tab.value)}
              className={`flex-1 text-center text-sm font-medium py-1.5 px-3 rounded-md whitespace-nowrap transition-colors ${
                activeTab === tab.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'splits' && (
          <SplitList splits={splits} friends={friends} groups={groups} />
        )}

        {activeTab === 'friends' && <FriendList friends={friends} />}

        {activeTab === 'groups' && (
          <GroupList
            groups={groups}
            friends={friends.filter((f) => !f.deleted_at).map((f) => ({ id: f.id, name: f.name }))}
          />
        )}

        {activeTab === 'balances' && (
          <BalanceSummary friends={friends} totalOwed={totalOwed} />
        )}
    </div>
  )
}
