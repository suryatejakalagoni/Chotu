/**
 * Section-H static timetable config for the Bunk Calculator.
 *
 * Pure data + tiny pure lookups. No DB, no React, no I/O, no Date.now().
 * The new bunk model does NOT auto-count from a stored timetable; the student
 * reads their cumulative Present / Total session counts off the iLMS portal and
 * we project the FUTURE bunkable sessions from this fixed schedule.
 *
 * Weekday indices follow JS `Date.getUTCDay()`: 0 = Sunday .. 6 = Saturday.
 */

export const SECTION = 'CSE-H' as const
export const PORTAL_URL = 'https://cvrcoe.in/ilms' as const

/** Attendance thresholds (percent). */
export const REQUIRED_PCT = 75 as const // safe — stay at/above this
export const FLOOR_PCT = 65 as const // condonation cushion — below = detention

/** Instruction period, inclusive, as 'YYYY-MM-DD'. */
export const INSTRUCTION_START = '2026-06-22' as const
export const INSTRUCTION_END = '2026-10-24' as const

/**
 * Regular sessions conducted on each weekday, indexed by JS weekday (0=Sun).
 * Sun 0, Mon 6, Tue 6, Wed 6, Thu 6, Fri 5, Sat 5.
 */
export const SESSIONS_PER_WEEKDAY: Readonly<Record<number, number>> = {
  0: 0, // Sunday
  1: 6, // Monday
  2: 6, // Tuesday
  3: 6, // Wednesday
  4: 6, // Thursday
  5: 5, // Friday
  6: 5, // Saturday
}

/**
 * Dates with NO regular classes — excluded from session counting.
 * (Sundays are already 0 sessions, so they are not listed here.)
 *   2026-07-11 / 08-08 / 09-12 / 10-10 — 2nd Saturdays
 *   2026-10-19 / 10-20 / 10-21          — Dussehra
 *   2026-08-24 .. 08-28                 — I-Mid week (no regular classes)
 */
export const HOLIDAYS: readonly string[] = [
  '2026-07-11',
  '2026-08-08',
  '2026-09-12',
  '2026-10-10',
  '2026-10-19',
  '2026-10-20',
  '2026-10-21',
  '2026-08-24',
  '2026-08-25',
  '2026-08-26',
  '2026-08-27',
  '2026-08-28',
]

const HOLIDAY_SET: ReadonlySet<string> = new Set(HOLIDAYS)

/** True if `dateStr` ('YYYY-MM-DD') is a listed no-class holiday. */
export function isHoliday(dateStr: string): boolean {
  return HOLIDAY_SET.has(dateStr)
}

/** Sessions scheduled for a JS weekday index (0=Sun .. 6=Sat). */
export function sessionsForWeekday(weekday: number): number {
  return SESSIONS_PER_WEEKDAY[weekday] ?? 0
}
