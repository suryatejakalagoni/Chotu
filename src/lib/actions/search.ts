'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  q: z.string().min(1).max(100).trim(),
  filter: z.enum(['all', 'assignments', 'exams', 'expenses', 'community']).default('all'),
})

// Escape ILIKE special chars so user input isn't treated as a pattern
function escapeLike(s: string) {
  return s.replace(/[%_\\]/g, (c) => `\\${c}`)
}

export type AssignmentResult = { id: string; title: string; subject: string | null; due_at: string; status: string }
export type ExamResult       = { id: string; subject: string; exam_type: string | null; exam_at: string; status: string }
export type ExpenseResult    = { id: string; title: string; amount: number; spent_at: string }
export type CommunityResult  = { id: string; title: string; subject_tag: string | null; content_type: string }

export type SearchResults = {
  assignments: AssignmentResult[]
  exams:       ExamResult[]
  expenses:    ExpenseResult[]
  community:   CommunityResult[]
}

export async function globalSearch(
  rawQ: string,
  rawFilter: string,
): Promise<{ data: SearchResults | null; error?: string }> {
  const parsed = schema.safeParse({ q: rawQ, filter: rawFilter })
  if (!parsed.success) return { data: null, error: 'Invalid query.' }

  const { q, filter } = parsed.data
  const like = `%${escapeLike(q)}%`

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Not authenticated.' }

  const results: SearchResults = { assignments: [], exams: [], expenses: [], community: [] }
  const all = filter === 'all'

  await Promise.all([
    // Assignments
    (all || filter === 'assignments') && supabase
      .from('assignments')
      .select('id, title, subject, due_at, status')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .or(`title.ilike.${like},subject.ilike.${like}`)
      .order('due_at', { ascending: true })
      .limit(5)
      .then(({ data }) => { results.assignments = (data ?? []) as AssignmentResult[] }),

    // Exams — subject is the main text field
    (all || filter === 'exams') && supabase
      .from('exams')
      .select('id, subject, exam_type, exam_at, status')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .or(`subject.ilike.${like},exam_type.ilike.${like}`)
      .order('exam_at', { ascending: true })
      .limit(5)
      .then(({ data }) => { results.exams = (data ?? []) as ExamResult[] }),

    // Expenses
    (all || filter === 'expenses') && supabase
      .from('expenses')
      .select('id, title, amount, spent_at')
      .eq('user_id', user.id)
      .ilike('title', like)
      .order('spent_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { results.expenses = (data ?? []) as ExpenseResult[] }),

    // Community — RLS already excludes deleted posts
    (all || filter === 'community') && supabase
      .from('community_posts')
      .select('id, title, subject_tag, content_type')
      .or(`title.ilike.${like},description.ilike.${like},subject_tag.ilike.${like}`)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { results.community = (data ?? []) as CommunityResult[] }),
  ])

  return { data: results }
}
