// HIDDEN — Splits feature parked. Un-comment the block below to restore.
import { notFound } from 'next/navigation'
export default function SplitDetailPage() { return notFound() }

/*
import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSplitById } from '@/lib/actions/splits'
import { getFriendsWithBalance } from '@/lib/actions/friends'
import { getGroupsWithBalance } from '@/lib/actions/groups'
import { SettleButton } from '@/components/splits/splits/settle-button'
import { SplitDetailActions } from '@/components/splits/splits/split-detail-actions'
import { formatRupees, toPaise, toRupees } from '@/lib/split-utils'
import { logOut } from '@/lib/actions/auth'

export const metadata: Metadata = { title: 'Split Detail — CHOTU' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function SplitDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const [{ split }, { friends }, { groups }] = await Promise.all([
    getSplitById(id),
    getFriendsWithBalance(),
    getGroupsWithBalance(),
  ])

  if (!split) notFound()

  const pendingTotal = toRupees(
    split.shares
      .filter((sh) => !sh.is_settled)
      .reduce((s, sh) => s + toPaise(sh.amount_owed), 0)
  )
  const settledTotal = toRupees(
    split.shares
      .filter((sh) => sh.is_settled)
      .reduce((s, sh) => s + toPaise(sh.amount_owed), 0)
  )

  const formattedDate = new Date(split.paid_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const friendsForForm = friends
    .filter((f) => !f.deleted_at)
    .map((f) => ({ id: f.id, name: f.name }))
  const groupsForForm = groups.map((g) => ({ id: g.id, name: g.name }))

  return (
    <main className="min-h-screen bg-background">
      <nav className="border-b px-4 py-3 flex items-center justify-between">
        <span className="font-bold">CHOTU</span>
        <div className="flex items-center gap-4">
          <Link href="/splits" className="text-sm text-muted-foreground hover:text-foreground">
            ← Splits
          </Link>
          <form action={logOut}>
            <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
              Log out
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-bold">{split.title}</h1>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
            {split.group_name && (
              <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 text-xs px-2 py-0.5">
                {split.group_name}
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-full text-xs px-2 py-0.5 font-medium ml-2 ${
                split.status === 'settled'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              {split.status === 'settled' ? 'Settled' : 'Pending'}
            </span>
          </div>

          <SplitDetailActions
            split={split}
            friends={friendsForForm}
            groups={groupsForForm}
          />
        </div>

        {split.description && (
          <p className="text-sm text-muted-foreground">{split.description}</p>
        )}

        <div className="rounded-xl border bg-card p-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{formatRupees(split.total_amount)}</span>
          </div>
          {pendingTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pending</span>
              <span className="text-orange-600 font-medium">{formatRupees(pendingTotal)}</span>
            </div>
          )}
          {settledTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Settled</span>
              <span className="text-green-600 font-medium">{formatRupees(settledTotal)}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold text-sm">Shares</h2>
          {split.shares.map((sh) => (
            <div
              key={sh.id}
              className="flex items-center justify-between py-3 px-4 rounded-lg border gap-2"
            >
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${sh.is_settled ? 'text-muted-foreground line-through' : ''}`}
                >
                  {sh.friend_name}
                </p>
                {sh.settled_at && (
                  <p className="text-xs text-muted-foreground">
                    Settled{' '}
                    {new Date(sh.settled_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </p>
                )}
              </div>
              <span className="text-sm font-medium">{formatRupees(sh.amount_owed)}</span>
              <SettleButton
                shareId={sh.id}
                isSettled={sh.is_settled}
                friendName={sh.friend_name}
              />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
*/
