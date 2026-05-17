import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IncomeList } from '@/components/expenses/income-list'

export default async function IncomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [{ data: incomes }, { data: categories }] = await Promise.all([
    supabase
      .from('income')
      .select('*')
      .eq('user_id', user.id)
      .gte('received_at', monthStart)
      .order('received_at', { ascending: false }),
    supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .order('name'),
  ])

  return <IncomeList incomes={incomes ?? []} categories={categories ?? []} />
}
