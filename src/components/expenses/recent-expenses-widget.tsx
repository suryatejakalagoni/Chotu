import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function fmt(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export async function RecentExpensesWidget() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('expenses')
    .select('id, title, amount, spent_at, categories(name)')
    .eq('user_id', user.id)
    .order('spent_at', { ascending: false })
    .limit(5)

  const expenses = data ?? []

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Recent Expenses</CardTitle>
          <Link href="/expenses" className="text-xs text-muted-foreground hover:underline">
            View all →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses yet.</p>
        ) : (
          <ul className="space-y-2">
            {expenses.map((e) => {
              const cat = Array.isArray(e.categories) ? e.categories[0] : e.categories
              return (
                <li key={e.id} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat?.name ?? 'Uncategorised'} · {fmtDate(e.spent_at)}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-destructive shrink-0">
                    {fmt(e.amount)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
