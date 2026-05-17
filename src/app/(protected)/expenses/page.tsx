import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExpenseList } from '@/components/expenses/expense-list'
import { AddExpenseButton } from '@/components/expenses/add-expense-button'
import { MonthlyPieChart } from '@/components/expenses/charts/monthly-pie'
import { DailyBarChart } from '@/components/expenses/charts/daily-bar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: monthExpenses }, { data: last30Expenses }, { data: categories }] =
    await Promise.all([
      supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('spent_at', monthStart)
        .order('spent_at', { ascending: false }),
      supabase
        .from('expenses')
        .select('id, spent_at, amount')
        .eq('user_id', user.id)
        .gte('spent_at', thirtyDaysAgo),
      supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('name'),
    ])

  const expenses = monthExpenses ?? []
  const totalThisMonth = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            This month:{' '}
            <span className="font-semibold text-foreground">
              ₹{totalThisMonth.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </p>
        </div>
        <AddExpenseButton categories={categories ?? []} />
      </div>

      {/* Charts */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Spend by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyPieChart expenses={expenses} categories={categories ?? []} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Daily Spend (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <DailyBarChart expenses={last30Expenses ?? []} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expense list */}
      <ExpenseList expenses={expenses} categories={categories ?? []} />
    </div>
  )
}
