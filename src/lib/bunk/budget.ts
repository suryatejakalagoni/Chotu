/**
 * Bunk budget — pure projection from a portal snapshot.
 *
 * No DB, no React, no I/O, no Date.now(). The caller passes `today` so the
 * function is fully deterministic and testable. Date math is done in UTC and
 * compared as 'YYYY-MM-DD' strings to avoid local-timezone / DST off-by-one
 * bugs (same convention as calc.ts).
 *
 * The student reads cumulative Present / Total session counts off the iLMS
 * portal; we count the remaining Section-H sessions after today and work out
 * how many of them can be skipped while staying above 75% (and 65%).
 */

import {
  INSTRUCTION_END,
  REQUIRED_PCT,
  FLOOR_PCT,
  isHoliday,
  sessionsForWeekday,
} from './sectionH.ts'

// ─── public types ─────────────────────────────────────────────────────────────

export type Zone = 'safe' | 'condonation' | 'detention'

export interface BunkBudgetInput {
  present: number // sessions attended, from iLMS
  total: number // sessions conducted so far, from iLMS
  today: string // 'YYYY-MM-DD' — today's classes are assumed already in `total`
}

/** Whole upcoming days that fit a session budget, plus leftover periods. */
export interface DaysBreakdown {
  days: number // whole upcoming class-days coverable
  periods: number // leftover sessions on the next partial day
}

export interface BunkBudgetResult {
  currentPct: number // present/total*100, 0 when total===0
  zone: Zone
  remaining: number // Section-H sessions strictly after today..INSTRUCTION_END
  finalTotal: number // total + remaining
  bunkableAt75: number // skippable while finishing >= 75%, clamped 0..remaining
  bunkableAt65: number // skippable while finishing >= 65%, clamped 0..remaining
  daysAt75: DaysBreakdown // bunkableAt75 expressed as whole days + periods
}

// ─── internal date helpers (UTC only, string-compared) ────────────────────────

const DAY_MS = 86_400_000

function toUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

function fmt(ts: number): string {
  const d = new Date(ts)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function weekdayOf(ts: number): number {
  return new Date(ts).getUTCDay()
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

/** Sessions conducted on a given UTC day (0 on holidays / no-class weekdays). */
function sessionsOn(ts: number): number {
  if (isHoliday(fmt(ts))) return 0
  return sessionsForWeekday(weekdayOf(ts))
}

// ─── engine ───────────────────────────────────────────────────────────────────

export function computeBunkBudget(input: BunkBudgetInput): BunkBudgetResult {
  const { present, total, today } = input

  const currentPct = total > 0 ? (present / total) * 100 : 0

  // Remaining sessions: every date STRICTLY AFTER today through INSTRUCTION_END
  // (today's classes are assumed already counted in the portal Total).
  const endTs = toUTC(INSTRUCTION_END)
  let remaining = 0
  for (let t = toUTC(today) + DAY_MS; t <= endTs; t += DAY_MS) {
    remaining += sessionsOn(t)
  }

  const finalTotal = total + remaining

  const bunkableAt75 = clamp(
    Math.floor(present + remaining - (REQUIRED_PCT / 100) * finalTotal),
    0,
    remaining,
  )
  const bunkableAt65 = clamp(
    Math.floor(present + remaining - (FLOOR_PCT / 100) * finalTotal),
    0,
    remaining,
  )

  // Express bunkableAt75 as whole upcoming class-days + leftover periods.
  // Walk forward chronologically; take a day whole only if the full budget
  // covers it, otherwise the remainder is the partial-day leftover.
  let budget = bunkableAt75
  let days = 0
  for (let t = toUTC(today) + DAY_MS; t <= endTs; t += DAY_MS) {
    const s = sessionsOn(t)
    if (s === 0) continue
    if (budget >= s) {
      budget -= s
      days++
    } else {
      break
    }
  }
  const daysAt75: DaysBreakdown = { days, periods: budget }

  let zone: Zone
  if (currentPct >= REQUIRED_PCT) zone = 'safe'
  else if (currentPct >= FLOOR_PCT) zone = 'condonation'
  else zone = 'detention'

  return {
    currentPct,
    zone,
    remaining,
    finalTotal,
    bunkableAt75,
    bunkableAt65,
    daysAt75,
  }
}
