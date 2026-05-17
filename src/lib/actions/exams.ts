'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  examCreateSchema,
  examUpdateSchema,
  examStatusSchema,
  topicCreateSchema,
  topicToggleSchema,
} from '@/lib/validations/exams'
import { calcExamTriggerAt, type ExamReminderSelection } from '@/lib/exam-utils'
import {
  syncExamRemindersToCalendar,
  deleteExamRemindersFromCalendar,
} from '@/lib/actions/google-calendar'

export type ActionResult = { error?: string }

async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, user }
}

async function saveExamReminders(
  supabase: Awaited<ReturnType<typeof getAuthUser>>['supabase'],
  userId: string,
  examId: string,
  examAt: Date,
  reminders: ExamReminderSelection[],
) {
  if (reminders.length === 0) return
  const rows = reminders
    .map((r) => {
      const trigger = calcExamTriggerAt(examAt, r.reminder_type)
      if (!trigger) return null
      return {
        exam_id:       examId,
        user_id:       userId,
        trigger_at:    trigger.toISOString(),
        reminder_type: r.reminder_type,
        sent:          false,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
  if (rows.length > 0) {
    const { error } = await supabase.from('exam_reminders').insert(rows)
    if (error) console.error('[saveExamReminders]', error.message)
  }
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function createExam(
  raw: unknown,
  reminders: ExamReminderSelection[] = [],
): Promise<ActionResult & { id?: string }> {
  const parsed = examCreateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const d = parsed.data

  try {
    const { supabase, user } = await getAuthUser()
    const { data: inserted, error } = await supabase
      .from('exams')
      .insert({
        user_id:       user.id,
        subject:       d.subject,
        title:         d.exam_type ? `${d.subject} — ${d.exam_type}` : d.subject,
        exam_type:     d.exam_type ?? null,
        exam_at:       new Date(d.exam_at).toISOString(),
        venue:         d.venue ?? null,
        syllabus_text: d.syllabus_text ?? null,
        notes:         d.notes ?? null,
        status:        d.status,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      console.error('[createExam]', error?.message)
      return { error: 'Could not save exam. Please try again.' }
    }

    await saveExamReminders(supabase, user.id, inserted.id, new Date(d.exam_at), reminders)

    // Calendar sync — fire-and-forget, never blocks the save
    void syncExamRemindersToCalendar(
      user.id, inserted.id, d.subject, d.exam_type ?? null, new Date(d.exam_at), d.notes ?? null,
    )

    revalidatePath('/exams')
    revalidatePath('/dashboard')
    return { id: inserted.id }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function updateExam(
  raw: unknown,
  reminders?: ExamReminderSelection[],
): Promise<ActionResult> {
  const parsed = examUpdateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { id, ...d } = parsed.data

  try {
    const { supabase, user } = await getAuthUser()

    const updateData: Record<string, unknown> = {}
    if (d.subject       !== undefined) updateData.subject       = d.subject
    if (d.exam_type     !== undefined) {
      updateData.exam_type = d.exam_type ?? null
      updateData.title     = d.exam_type
        ? `${d.subject ?? ''} — ${d.exam_type}`
        : (d.subject ?? '')
    }
    if (d.exam_at       !== undefined) updateData.exam_at       = new Date(d.exam_at).toISOString()
    if (d.venue         !== undefined) updateData.venue         = d.venue ?? null
    if (d.syllabus_text !== undefined) updateData.syllabus_text = d.syllabus_text ?? null
    if (d.notes         !== undefined) updateData.notes         = d.notes ?? null
    if (d.status        !== undefined) updateData.status        = d.status

    const { error } = await supabase
      .from('exams')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[updateExam]', error.message)
      return { error: 'Could not update exam. Please try again.' }
    }

    if (reminders !== undefined && d.exam_at) {
      // Delete old Calendar events before replacing reminder rows
      await deleteExamRemindersFromCalendar(user.id, id)

      await supabase
        .from('exam_reminders')
        .delete()
        .eq('exam_id', id)
        .eq('user_id', user.id)
        .eq('sent', false)

      await saveExamReminders(supabase, user.id, id, new Date(d.exam_at), reminders)

      // Sync new reminders to Calendar
      const fullExam = await supabase
        .from('exams')
        .select('subject, exam_type, exam_at, notes')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (fullExam.data) {
        void syncExamRemindersToCalendar(
          user.id, id,
          fullExam.data.subject,
          fullExam.data.exam_type ?? null,
          new Date(fullExam.data.exam_at),
          fullExam.data.notes ?? null,
        )
      }
    }

    revalidatePath('/exams')
    revalidatePath('/dashboard')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function deleteExam(examId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser()

    // Delete Calendar events before DB delete (cascade removes exam_reminders)
    await deleteExamRemindersFromCalendar(user.id, examId)

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId)
      .eq('user_id', user.id)
    if (error) return { error: 'Could not delete exam.' }
    revalidatePath('/exams')
    revalidatePath('/dashboard')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function archiveExam(examId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase
      .from('exams')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', examId)
      .eq('user_id', user.id)
    if (error) return { error: 'Could not archive exam.' }
    revalidatePath('/exams')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function unarchiveExam(examId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase
      .from('exams')
      .update({ archived_at: null })
      .eq('id', examId)
      .eq('user_id', user.id)
    if (error) return { error: 'Could not unarchive exam.' }
    revalidatePath('/exams')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function updateExamStatus(raw: unknown): Promise<ActionResult> {
  const parsed = examStatusSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid status' }

  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase
      .from('exams')
      .update({ status: parsed.data.status })
      .eq('id', parsed.data.id)
      .eq('user_id', user.id)
    if (error) return { error: 'Could not update status.' }
    revalidatePath('/exams')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export async function getExamReminders(
  examId: string,
): Promise<{ data?: { reminder_type: string; trigger_at: string }[]; error?: string }> {
  try {
    const { supabase, user } = await getAuthUser()
    const { data, error } = await supabase
      .from('exam_reminders')
      .select('reminder_type, trigger_at')
      .eq('exam_id', examId)
      .eq('user_id', user.id)
      .eq('sent', false)
    if (error) return { error: 'Could not load reminders.' }
    return { data: data ?? [] }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ─── Topics ──────────────────────────────────────────────────────────────────

export async function createTopic(raw: unknown): Promise<ActionResult> {
  const parsed = topicCreateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()

    // Verify exam ownership
    const { data: exam } = await supabase
      .from('exams')
      .select('id')
      .eq('id', parsed.data.exam_id)
      .eq('user_id', user.id)
      .single()
    if (!exam) return { error: 'Exam not found' }

    const { error } = await supabase.from('exam_topics').insert({
      exam_id:    parsed.data.exam_id,
      user_id:    user.id,
      topic_text: parsed.data.topic_text,
      is_revised: false,
    })
    if (error) return { error: 'Could not add topic.' }
    revalidatePath('/exams')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function toggleTopic(raw: unknown): Promise<ActionResult> {
  const parsed = topicToggleSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()

    // Ownership via RLS — but we also need to verify via exam join
    const { data: topic } = await supabase
      .from('exam_topics')
      .select('id, exam_id')
      .eq('id', parsed.data.id)
      .eq('user_id', user.id)
      .single()
    if (!topic) return { error: 'Topic not found' }

    const { error } = await supabase
      .from('exam_topics')
      .update({
        is_revised: parsed.data.is_revised,
        revised_at: parsed.data.is_revised ? new Date().toISOString() : null,
      })
      .eq('id', parsed.data.id)
      .eq('user_id', user.id)
    if (error) return { error: 'Could not update topic.' }
    revalidatePath('/exams')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function deleteTopic(topicId: string): Promise<ActionResult> {
  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase
      .from('exam_topics')
      .delete()
      .eq('id', topicId)
      .eq('user_id', user.id)
    if (error) return { error: 'Could not delete topic.' }
    revalidatePath('/exams')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ─── Autocomplete ─────────────────────────────────────────────────────────────

export async function getDistinctExamTypes(): Promise<string[]> {
  try {
    const { supabase, user } = await getAuthUser()
    const { data } = await supabase
      .from('exams')
      .select('exam_type')
      .eq('user_id', user.id)
      .not('exam_type', 'is', null)
    const seen = new Set<string>()
    return (data ?? [])
      .map((r) => r.exam_type!)
      .filter((t) => { if (seen.has(t)) return false; seen.add(t); return true })
  } catch {
    return []
  }
}

// ─── Cross-link: completed assignments same subject (rolling 4 months) ────────
// TODO Day 14: replace rolling window with user_settings.semester_start

export async function getLinkedAssignments(subject: string) {
  try {
    const { supabase, user } = await getAuthUser()
    const since = new Date()
    since.setMonth(since.getMonth() - 4)

    const { data } = await supabase
      .from('assignments')
      .select('id, title, subject, due_at, status')
      .eq('user_id', user.id)
      .eq('status', 'done')
      .ilike('subject', subject)
      .gte('due_at', since.toISOString())
      .is('archived_at', null)
      .order('due_at', { ascending: false })
      .limit(20)

    return data ?? []
  } catch {
    return []
  }
}
