'use server'

import {
  getValidAccessToken,
  revokeGoogleToken,
  deleteGoogleIntegration,
} from '@/lib/google-auth'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  type CalendarEventPayload,
} from '@/lib/google-calendar-client'
import { createClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ─── Assignment reminders ─────────────────────────────────────────────────────

export async function syncAssignmentRemindersToCalendar(
  userId: string,
  assignmentId: string,
  title: string,
  subject: string,
  dueAt: Date,
  notes: string | null,
): Promise<void> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return // user hasn't connected Google — silently skip

  const supabase = await createClient()
  const { data: reminders, error } = await supabase
    .from('assignment_reminders')
    .select('id, trigger_at, reminder_type, google_event_id')
    .eq('assignment_id', assignmentId)
    .eq('user_id', userId)
    .eq('sent', false)

  if (error || !reminders) {
    console.error('[syncAssignmentReminders] fetch error:', error?.message)
    return
  }

  for (const reminder of reminders) {
    const triggerAt = new Date(reminder.trigger_at)
    const endAt     = new Date(triggerAt.getTime() + 15 * 60 * 1000) // +15 min

    const payload: CalendarEventPayload = {
      title:       `[Chotu] ${subject} — ${title}`,
      description: [
        `Assignment due: ${dueAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
        notes ? `Notes: ${notes}` : null,
        `View in Chotu: ${APP_URL}/assignments`,
      ].filter(Boolean).join('\n'),
      startTime: triggerAt,
      endTime:   endAt,
    }

    try {
      if (reminder.google_event_id) {
        await updateCalendarEvent(accessToken, reminder.google_event_id, payload)
        await supabase
          .from('assignment_reminders')
          .update({ sync_failed_at: null })
          .eq('id', reminder.id)
      } else {
        const created = await createCalendarEvent(accessToken, payload)
        await supabase
          .from('assignment_reminders')
          .update({ google_event_id: created.id, sync_failed_at: null })
          .eq('id', reminder.id)
      }
    } catch {
      // Log failure but never block the assignment save
      console.error('[syncAssignmentReminders] Calendar push failed for reminder', reminder.id)
      await supabase
        .from('assignment_reminders')
        .update({ sync_failed_at: new Date().toISOString() })
        .eq('id', reminder.id)
    }
  }
}

export async function deleteAssignmentRemindersFromCalendar(
  userId: string,
  assignmentId: string,
): Promise<void> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return

  const supabase = await createClient()
  const { data: reminders } = await supabase
    .from('assignment_reminders')
    .select('id, google_event_id')
    .eq('assignment_id', assignmentId)
    .eq('user_id', userId)
    .not('google_event_id', 'is', null)

  if (!reminders) return

  for (const reminder of reminders) {
    if (!reminder.google_event_id) continue
    try {
      await deleteCalendarEvent(accessToken, reminder.google_event_id)
    } catch {
      console.error('[deleteAssignmentReminders] Calendar delete failed for reminder', reminder.id)
    }
  }
}

// ─── Exam reminders ───────────────────────────────────────────────────────────

export async function syncExamRemindersToCalendar(
  userId: string,
  examId: string,
  subject: string,
  examType: string | null,
  examAt: Date,
  notes: string | null,
): Promise<void> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return

  const supabase = await createClient()
  const { data: reminders, error } = await supabase
    .from('exam_reminders')
    .select('id, trigger_at, reminder_type, google_event_id')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .eq('sent', false)

  if (error || !reminders) {
    console.error('[syncExamReminders] fetch error:', error?.message)
    return
  }

  const examLabel = examType ? `${subject} ${examType}` : subject

  for (const reminder of reminders) {
    const triggerAt = new Date(reminder.trigger_at)
    const endAt     = new Date(triggerAt.getTime() + 15 * 60 * 1000)

    const payload: CalendarEventPayload = {
      title:       `[Chotu] Exam: ${examLabel}`,
      description: [
        `Exam: ${examAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
        notes ? `Notes: ${notes}` : null,
        `View in Chotu: ${APP_URL}/exams`,
      ].filter(Boolean).join('\n'),
      startTime: triggerAt,
      endTime:   endAt,
    }

    try {
      if (reminder.google_event_id) {
        await updateCalendarEvent(accessToken, reminder.google_event_id, payload)
        await supabase
          .from('exam_reminders')
          .update({ sync_failed_at: null })
          .eq('id', reminder.id)
      } else {
        const created = await createCalendarEvent(accessToken, payload)
        await supabase
          .from('exam_reminders')
          .update({ google_event_id: created.id, sync_failed_at: null })
          .eq('id', reminder.id)
      }
    } catch {
      console.error('[syncExamReminders] Calendar push failed for reminder', reminder.id)
      await supabase
        .from('exam_reminders')
        .update({ sync_failed_at: new Date().toISOString() })
        .eq('id', reminder.id)
    }
  }
}

export async function deleteExamRemindersFromCalendar(
  userId: string,
  examId: string,
): Promise<void> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) return

  const supabase = await createClient()
  const { data: reminders } = await supabase
    .from('exam_reminders')
    .select('id, google_event_id')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .not('google_event_id', 'is', null)

  if (!reminders) return

  for (const reminder of reminders) {
    if (!reminder.google_event_id) continue
    try {
      await deleteCalendarEvent(accessToken, reminder.google_event_id)
    } catch {
      console.error('[deleteExamReminders] Calendar delete failed for reminder', reminder.id)
    }
  }
}

// ─── Disconnect ───────────────────────────────────────────────────────────────

export async function disconnectGoogleCalendar(): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const accessToken = await getValidAccessToken(user.id)
    if (accessToken) await revokeGoogleToken(accessToken)
    await deleteGoogleIntegration(user.id)

    return {}
  } catch {
    return { error: 'Failed to disconnect Google Calendar' }
  }
}
