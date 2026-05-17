import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BudgetOverview } from '@/components/expenses/budget-overview'

function currentMonthString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const currentMonth = currentMonthString()

  const [{ data: budgets }, { data: expenses }, { data: incomes }, { data: categories }] =
    await Promise.all([
      supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .gte('starts_at', monthStart)
        .lte('starts_at', monthEnd),
      supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .gte('spent_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString()),
      supabase
        .from('income')
        .select('*')
        .eq('user_id', user.id)
        .gte('received_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString()),
      supabase
        .from('categories')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('name'),
    ])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        Budgets — {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
      </h1>
      <BudgetOverview
        budgets={budgets ?? []}
        expenses={expenses ?? []}
        incomes={incomes ?? []}
        categories={categories ?? []}
        currentMonth={currentMonth}
      />
    </div>
  )
}
