import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Mic } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ExpenseDashboardWidget } from '@/components/expenses/dashboard-widget'
import { RecentExpensesWidget } from '@/components/expenses/recent-expenses-widget'
import { AssignmentsDashboardWidget } from '@/components/assignments/dashboard-widget'
import { ExamsDashboardWidget } from '@/components/exams/dashboard-widget'
import { SplitsDashboardWidget } from '@/components/splits/splits/dashboard-widget'
import { CommunityDashboardWidget } from '@/components/community/dashboard-widget'
import { SavingsGoalsWidget } from '@/components/savings/savings-goals-widget'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart     = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEndDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

  const [{ data: profile }, { data: expenses }, { data: incomes }, { data: budgets }] =
    await Promise.all([
      supabase.from('profiles').select('display_name, is_admin').eq('id', user.id).single(),
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

  const isAdmin     = profile?.is_admin ?? false
  const userName    = profile?.display_name ?? user.email?.split('@')[0] ?? ''
  const totalSpent  = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0)
  const totalIncome = (incomes ?? []).reduce((sum, i) => sum + i.amount, 0)
  const overallBudget = budgets?.amount ?? null

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-xl font-semibold">
            Hey, {userName}!
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {now.toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* ── Voice placeholder — full width, prominent ── */}
        <Card className="border-dashed">
          <CardContent className="py-5">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted shrink-0">
                <Mic size={24} className="text-muted-foreground" />
              </div>
              <div className="text-center sm:text-left">
                <p className="font-medium text-sm">Voice Input</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-sm">
                  Coming Day 12. Works best on Android Chrome — iPhone Safari support is limited.
                </p>
              </div>
              <button
                disabled
                className="sm:ml-auto px-4 py-2 text-sm rounded-md bg-muted text-muted-foreground cursor-not-allowed opacity-60 shrink-0"
              >
                Coming soon
              </button>
            </div>
          </CardContent>
        </Card>

        {/* ── 2-column grid on md+, single column on mobile ── */}
        <div className="grid gap-4 md:grid-cols-2">
          <AssignmentsDashboardWidget />
          <ExamsDashboardWidget />
          <SplitsDashboardWidget />
          <RecentExpensesWidget />
          <CommunityDashboardWidget />
          <SavingsGoalsWidget />
        </div>

        {/* ── Bunk calculator placeholder ── */}
        <Card className="border-dashed">
          <CardContent className="py-4 text-center">
            <p className="text-sm font-medium">Attendance Tracker</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Coming soon — track your attendance and see how many classes you can safely bunk.
            </p>
          </CardContent>
        </Card>

        {/* ── Month spending vs budget — full width ── */}
        <ExpenseDashboardWidget
          spent={totalSpent}
          budget={overallBudget}
          income={totalIncome}
        />
    </main>
  )
}
