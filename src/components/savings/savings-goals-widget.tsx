import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n)
}

export async function SavingsGoalsWidget() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('savings_goals')
    .select('id, title, target_amount, current_amount, deadline')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const goals = data ?? []
  // Hide section entirely if no goals
  if (goals.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Savings Goals</CardTitle>
          <Link href="/expenses" className="text-xs text-muted-foreground hover:underline">
            View all →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((g) => {
          const pct = g.target_amount > 0
            ? Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100)
            : 0
          const barColor = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-primary'

          return (
            <div key={g.id} className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <p className="text-sm font-medium truncate max-w-[60%]">{g.title}</p>
                <p className="text-xs text-muted-foreground shrink-0">
                  {fmt(g.current_amount)} / {fmt(g.target_amount)}
                </p>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{pct}% saved</span>
                {g.deadline && (
                  <span>
                    by {new Date(g.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
