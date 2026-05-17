import { RRule } from 'rrule'

// ─── Recurrence ──────────────────────────────────────────────────────────────

/**
 * Build a weekly RRULE string anchored to the weekday of `startDate`.
 * e.g. due Wednesday → "RRULE:FREQ=WEEKLY;BYDAY=WE"
 */
export function buildWeeklyRRule(startDate: Date): string {
  const rruleDay = [
    RRule.SU, RRule.MO, RRule.TU, RRule.WE,
    RRule.TH, RRule.FR, RRule.SA,
  ][startDate.getUTCDay()]

  return new RRule({
    freq:    RRule.WEEKLY,
    byweekday: rruleDay,
    dtstart: new Date(Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
      startDate.getUTCHours(),
      startDate.getUTCMinutes(),
    )),
  }).toString()
}

/**
 * Returns the ISO date string (YYYY-MM-DD) for the nearest upcoming or
 * same-week occurrence of this RRULE, relative to today.
 */
export function getThisWeekOccurrenceDate(rruleString: string): string {
  const rule = RRule.fromString(rruleString)
  const now  = new Date()
  // Look ±8 days to find the current week's occurrence
  const after  = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
  const before = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000)
  const hits   = rule.between(after, before, true)
  if (hits.length === 0) return now.toISOString().slice(0, 10)
  // Pick the closest one (prefer upcoming over past)
  const upcoming = hits.find((d) => d >= now)
  const chosen   = upcoming ?? hits[hits.length - 1]
  return chosen.toISOString().slice(0, 10)
}

/**
 * Human-readable description of a weekly RRULE.
 * e.g. "Every Wednesday"
 */
export function describeRRule(rruleString: string): string {
  try {
    return RRule.fromString(rruleString).toText()
  } catch {
    return 'Recurring'
  }
}

// ─── Reminder time math ───────────────────────────────────────────────────────

export type ReminderType = '1_day' | '3_hours' | 'morning_of' | 'custom'

export interface ReminderSelection {
  reminder_type: ReminderType
  custom_time?:  string // ISO datetime, only for 'custom'
}

/**
 * Compute trigger_at for a given reminder type relative to due_at.
 * Returns null if the trigger would be in the past (skip it).
 *
 * "morning_of" = 8:00 AM IST (UTC+5:30 → UTC 02:30) on the date of due_at.
 */
export function calcTriggerAt(
  dueAt: Date,
  type: ReminderType,
  customTime?: string,
): Date | null {
  let trigger: Date

  if (type === '1_day') {
    trigger = new Date(dueAt.getTime() - 24 * 60 * 60 * 1000)
  } else if (type === '3_hours') {
    trigger = new Date(dueAt.getTime() - 3 * 60 * 60 * 1000)
  } else if (type === 'morning_of') {
    // 8:00 AM IST = 02:30 UTC
    trigger = new Date(Date.UTC(
      dueAt.getUTCFullYear(),
      dueAt.getUTCMonth(),
      dueAt.getUTCDate(),
      2, 30, 0,
    ))
  } else if (type === 'custom' && customTime) {
    trigger = new Date(customTime)
    if (isNaN(trigger.getTime())) return null
  } else {
    return null
  }

  // Skip reminders that are already in the past
  return trigger > new Date() ? trigger : null
}
