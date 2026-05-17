'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  assignmentCreateSchema,
  assignmentUpdateSchema,
  statusTransitionSchema,
} from '@/lib/validations/assignments'
import { calcTriggerAt, type ReminderSelection } from '@/lib/assignment-utils'

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

async function saveReminders(
  supabase: Awaited<ReturnType<typeof getAuthUser>>['supabase'],
  userId: string,
  assignmentId: string,
  dueAt: Date,
  reminders: ReminderSelection[],
) {
  if (reminders.length === 0) return
  const rows = reminders
    .map((r) => {
      const trigger = calcTriggerAt(dueAt, r.reminder_type, r.custom_time)
      if (!trigger) return null
      return {
        assignment_id: assignmentId,
        user_id:       userId,
        trigger_at:    trigger.toISOString(),
        reminder_type: r.reminder_type,
        sent:          false,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)
  if (rows.length > 0) {
    const { error } = await supabase.from('assignment_reminders').insert(rows)
    if (error) console.error('[saveReminders]', error.message)
  }
}

export async function createAssignment(
  raw: unknown,
  reminders: ReminderSelection[] = [],
): Promise<ActionResult> {
  const parsed = assignmentCreateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const d = parsed.data

  if (new Date(d.due_at) <= new Date()) {
    return { error: 'Due date must be in the future' }
  }

  try {
    const { supabase, user } = await getAuthUser()
    const { data: inserted, error } = await supabase
      .from('assignments')
      .insert({
        user_id:           user.id,
        subject:           d.subject,
        title:             d.title,
        description:       d.description ?? null,
        due_at:            new Date(d.due_at).toISOString(),
        estimated_minutes: d.estimated_minutes ?? null,
        status:            d.status,
        priority:          d.priority,
        notes:             d.notes ?? null,
        is_recurring:      d.is_recurring,
        recurrence_rule:   d.recurrence_rule ?? null,
      })
      .select('id')
      .single()

    if (error || !inserted) {
      console.error('[createAssignment]', error?.message)
      return { error: 'Could not save assignment. Please try again.' }
    }

    await saveReminders(supabase, user.id, inserted.id, new Date(d.due_at), reminders)

    revalidatePath('/assignments')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function updateAssignment(
  raw: unknown,
  reminders?: ReminderSelection[],
): Promise<ActionResult> {
  const parsed = assignmentUpdateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { id, ...rest } = parsed.data

  try {
    const { supabase, user } = await getAuthUser()
    const { data: updated, error } = await supabase
      .from('assignments')
      .update({
        ...rest,
        due_at:            rest.due_at ? new Date(rest.due_at).toISOString() : undefined,
        description:       rest.description ?? null,
        notes:             rest.notes ?? null,
        estimated_minutes: rest.estimated_minutes ?? null,
        recurrence_rule:   rest.recurrence_rule ?? null,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('due_at')
      .single()

    if (error) {
      console.error('[updateAssignment]', error.message)
      return { error: 'Could not update assignment.' }
    }

    // Replace reminders if caller passed a new set
    if (reminders !== undefined && updated?.due_at) {
      await supabase
        .from('assignment_reminders')
        .delete()
        .eq('assignment_id', id)
        .eq('user_id', user.id)
        .eq('sent', false) // never delete already-sent reminders

      await saveReminders(supabase, user.id, id, new Date(updated.due_at), reminders)
    }

    revalidatePath('/assignments')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  if (!id) return { error: 'Invalid id' }
  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) {
      console.error('[deleteAssignment]', error.message)
      return { error: 'Could not delete assignment.' }
    }
    revalidatePath('/assignments')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function transitionStatus(raw: unknown): Promise<ActionResult> {
  const parsed = statusTransitionSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()

    const updateData: Record<string, unknown> = { status: parsed.data.status }
    if (parsed.data.status === 'done') {
      updateData.archived_at = new Date().toISOString()
    } else {
      updateData.archived_at = null
    }

    const { error } = await supabase
      .from('assignments')
      .update(updateData)
      .eq('id', parsed.data.id)
      .eq('user_id', user.id)
    if (error) {
      console.error('[transitionStatus]', error.message)
      return { error: 'Could not update status.' }
    }
    revalidatePath('/assignments')
    revalidatePath('/assignments/archive')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function archiveAssignment(id: string): Promise<ActionResult> {
  if (!id) return { error: 'Invalid id' }
  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase
      .from('assignments')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return { error: 'Could not archive assignment.' }
    revalidatePath('/assignments')
    revalidatePath('/assignments/archive')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function unarchiveAssignment(id: string): Promise<ActionResult> {
  if (!id) return { error: 'Invalid id' }
  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase
      .from('assignments')
      .update({ archived_at: null, status: 'not_started' })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) return { error: 'Could not restore assignment.' }
    revalidatePath('/assignments')
    revalidatePath('/assignments/archive')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ─── Recurring completions ────────────────────────────────────────────────────

export async function completeRecurringOccurrence(
  assignmentId: string,
  occurrenceDate: string, // YYYY-MM-DD
): Promise<ActionResult> {
  if (!assignmentId || !occurrenceDate) return { error: 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()

    // Verify assignment belongs to user
    const { data: a } = await supabase
      .from('assignments')
      .select('id, is_recurring')
      .eq('id', assignmentId)
      .eq('user_id', user.id)
      .single()
    if (!a) return { error: 'Assignment not found' }
    if (!a.is_recurring) return { error: 'Not a recurring assignment' }

    const { error } = await supabase
      .from('recurring_completions')
      .upsert(
        { assignment_id: assignmentId, user_id: user.id, occurrence_date: occurrenceDate },
        { onConflict: 'assignment_id,occurrence_date' },
      )
    if (error) {
      console.error('[completeRecurringOccurrence]', error.message)
      return { error: 'Could not mark as complete.' }
    }

    revalidatePath('/assignments')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function uncompleteRecurringOccurrence(
  assignmentId: string,
  occurrenceDate: string,
): Promise<ActionResult> {
  if (!assignmentId || !occurrenceDate) return { error: 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase
      .from('recurring_completions')
      .delete()
      .eq('assignment_id', assignmentId)
      .eq('user_id', user.id)
      .eq('occurrence_date', occurrenceDate)
    if (error) return { error: 'Could not undo completion.' }
    revalidatePath('/assignments')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ─── Load reminders for a given assignment (used in edit form) ────────────────

export async function getAssignmentReminders(
  assignmentId: string,
): Promise<{ data?: { reminder_type: string; trigger_at: string }[]; error?: string }> {
  try {
    const { supabase, user } = await getAuthUser()
    const { data, error } = await supabase
      .from('assignment_reminders')
      .select('reminder_type, trigger_at')
      .eq('assignment_id', assignmentId)
      .eq('user_id', user.id)
      .eq('sent', false)
    if (error) return { error: 'Could not load reminders.' }
    return { data: data ?? [] }
  } catch {
    return { error: 'Not authenticated.' }
  }
}
