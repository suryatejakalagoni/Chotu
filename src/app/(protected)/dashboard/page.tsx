import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import type { DashAssignment, DashExam, DashExpense, DashPost } from '@/components/dashboard/DashboardClient'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthStartDate = monthStart.slice(0, 10) // "YYYY-MM-DD" for budget comparison
  const fourDaysOut = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString()
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: profile },
    { data: asnRows },
    { data: examRows },
    { data: expRows },
    { data: monthExpRows },
    { data: postRows },
    { data: monthIncomeRows },
    { data: monthBudgetRow },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single(),

    supabase
      .from('assignments')
      .select('id, subject, title, due_at, status')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .neq('status', 'done')
      .lte('due_at', fourDaysOut)
      .order('due_at', { ascending: true })
      .limit(8),

    supabase
      .from('exams')
      .select('id, subject, title, exam_type, exam_at, venue, status')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .eq('status', 'upcoming')
      .gte('exam_at', now.toISOString())
      .order('exam_at', { ascending: true })
      .limit(4),

    supabase
      .from('expenses')
      .select('id, title, amount, category_id, spent_at, categories(name, icon)')
      .eq('user_id', user.id)
      .order('spent_at', { ascending: false })
      .limit(4),

    supabase
      .from('expenses')
      .select('amount')
      .eq('user_id', user.id)
      .gte('spent_at', monthStart),

    supabase
      .from('community_posts')
      .select('id, title, content_type, subject_tag, created_at')
      .is('deleted_at', null)
      .gte('created_at', oneWeekAgo)
      .order('created_at', { ascending: false })
      .limit(3),

    // Monthly income total
    supabase
      .from('income')
      .select('amount')
      .eq('user_id', user.id)
      .gte('received_at', monthStart),

    // Overall monthly budget (category_id IS NULL = total budget, not per-category)
    supabase
      .from('budgets')
      .select('amount')
      .eq('user_id', user.id)
      .is('category_id', null)
      .eq('starts_at', monthStartDate)
      .maybeSingle(),
  ])

  const userName = profile?.display_name ?? user.email?.split('@')[0] ?? 'there'
  const monthTotal = (monthExpRows ?? []).reduce((s, e) => s + e.amount, 0)
  const monthIncome = (monthIncomeRows ?? []).reduce((s, r) => s + r.amount, 0)
  const monthBudget = monthBudgetRow?.amount ?? null

  const assignments: DashAssignment[] = (asnRows ?? []).map(r => ({
    id: r.id,
    subject: r.subject,
    title: r.title,
    due_at: r.due_at,
    status: r.status as DashAssignment['status'],
  }))

  const exams: DashExam[] = (examRows ?? []).map(r => ({
    id: r.id,
    subject: r.subject,
    title: r.title,
    exam_type: r.exam_type,
    exam_at: r.exam_at,
    venue: r.venue,
    status: r.status as DashExam['status'],
  }))

  const expenses: DashExpense[] = (expRows ?? []).map(r => {
    const cat = Array.isArray(r.categories) ? r.categories[0] : r.categories
    return {
      id: r.id,
      title: r.title,
      amount: r.amount,
      category_name: cat?.name ?? null,
      category_icon: cat?.icon ?? null,
      spent_at: r.spent_at,
    }
  })

  const posts: DashPost[] = (postRows ?? []).map(r => ({
    id: r.id,
    title: r.title,
    content_type: r.content_type,
    subject_tag: r.subject_tag,
    created_at: r.created_at,
  }))

  return (
    <DashboardClient
      userName={userName}
      assignments={assignments}
      exams={exams}
      expenses={expenses}
      posts={posts}
      monthTotal={monthTotal}
      monthIncome={monthIncome}
      monthBudget={monthBudget}
    />
  )
}
