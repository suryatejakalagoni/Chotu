import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logOut } from '@/lib/actions/auth'
import { ExpenseDashboardWidget } from '@/components/expenses/dashboard-widget'
import { AssignmentsDashboardWidget } from '@/components/assignments/dashboard-widget'

export const metadata: Metadata = { title: 'Dashboard — CHOTU' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

  const [{ data: profile }, { data: expenses }, { data: incomes }, { data: budgets }] =
    await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', user.id).single(),
      supabase.from('expenses').select('amount').eq('user_id', user.id).gte('spent_at', monthStart),
      supabase.from('income').select('amount').eq('user_id', user.id).gte('received_at', monthStart),
      supabase
        .from('budgets')
        .select('amount, category_id')
        .eq('user_id', user.id)
        .gte('starts_at', monthStartDate)
        .lte('starts_at', monthEndDate)
        .is('category_id', null)
        .maybeSingle(),
    ])

  const totalSpent = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0)
  const totalIncome = (incomes ?? []).reduce((sum, i) => sum + i.amount, 0)
  const overallBudget = budgets?.amount ?? null

  return (
    <main className="min-h-screen bg-background">
      <nav className="border-b px-4 py-3 flex items-center justify-between">
        <span className="font-bold">CHOTU</span>
        <div className="flex items-center gap-4">
          <Link href="/expenses" className="text-sm text-muted-foreground hover:text-foreground">
            Expenses
          </Link>
          <Link href="/assignments" className="text-sm text-muted-foreground hover:text-foreground">
            Assignments
          </Link>
          <form action={logOut}>
            <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
              Log out
            </button>
          </form>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Hey, {profile?.display_name ?? user.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {now.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <ExpenseDashboardWidget
          spent={totalSpent}
          budget={overallBudget}
          income={totalIncome}
        />

        <AssignmentsDashboardWidget />

        <p className="text-sm text-muted-foreground text-center">
          More modules coming soon — exams, splits.
        </p>
      </div>
    </main>
  )
}
