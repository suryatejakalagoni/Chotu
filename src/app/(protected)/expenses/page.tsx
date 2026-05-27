import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExpensesClient } from '@/components/expenses/ExpensesClient'

function currentMonthString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

  const [{ data: expenses }, { data: categories }, { data: budgets }, { data: incomes }] =
    await Promise.all([
      supabase
        .from('expenses')
        .select('id, title, amount, category_id, payment_method, spent_at, notes')
        .eq('user_id', user.id)
        .gte('spent_at', ninetyDaysAgo)
        .order('spent_at', { ascending: false }),
      supabase
        .from('categories')
        .select('id, name, color, icon, type')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('name'),
      supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .gte('starts_at', monthStartDate)
        .lte('starts_at', monthEndDate),
      supabase
        .from('income')
        .select('*')
        .eq('user_id', user.id)
        .gte('received_at', monthStart),
    ])

  return (
    <ExpensesClient
      initialExpenses={expenses ?? []}
      categories={categories ?? []}
      budgets={budgets ?? []}
      incomes={incomes ?? []}
      currentMonth={currentMonthString()}
    />
  )
}
