import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExpensesClient } from '@/components/expenses/ExpensesClient'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: expenses }, { data: categories }] = await Promise.all([
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
  ])

  return (
    <ExpensesClient
      initialExpenses={expenses ?? []}
      categories={categories ?? []}
    />
  )
}
