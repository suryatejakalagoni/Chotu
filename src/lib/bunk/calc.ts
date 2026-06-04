/**
 * Bunk Calculator — pure calculation engine.
 *
 * No I/O, no Supabase, no React, no globals, no Date.now(). The caller passes a
 * formatted `referenceDate` ('today') so the function is fully deterministic and
 * testable. All date math is done in UTC and compared as 'YYYY-MM-DD' strings to
 * avoid local-timezone / DST off-by-one bugs.
 *
 * The engine AUTO-COUNTS classes by walking the calendar: the student never
 * enters how many classes were conducted. "Held so far" and "remaining" are both
 * derived from timetable slots × working days − holidays. The only absence data
 * is a list of missed (date, slot) rows.
 */

// ─── public types ─────────────────────────────────────────────────────────────

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0=Sun .. 6=Sat (JS getDay())

export interface Slot {
  id: string
  weekday: Weekday
  position: number
  subject?: string | null
}

export interface MissedEntry {
  missed_date: string // 'YYYY-MM-DD'
  slot_id: string | null
}

export interface SemesterConfig {
  start_date: string // 'YYYY-MM-DD'
  end_date: string // 'YYYY-MM-DD'
  required_pct: number // e.g. 75
  floor_pct: number // e.g. 65
}

export interface BunkInput {
  semester: SemesterConfig
  slots: Slot[]
  holidays: string[] // ['YYYY-MM-DD', ...]
  missed: MissedEntry[]
  referenceDate: string // 'today' — divides past/future. REQUIRED.
  horizonDate?: string // 'bunk until this date'; default = semester.end_date
}

export interface BunkResult {
  heldSoFar: number // working slots in [start, min(reference, end)]
  missedCount: number // valid missed periods within that same range
  attendedSoFar: number // heldSoFar - missedCount (>= 0)
  currentPct: number // attendedSoFar/heldSoFar*100, 0 if heldSoFar===0
  remainingToHorizon: number // working slots in (reference, min(horizon, end)]
  totalToHorizon: number // heldSoFar + remainingToHorizon
  maxBunkSafe: number // most future periods skippable, staying >= required, clamped 0..remaining
  maxBunkFloor: number // same, against floor_pct, clamped 0..remaining
  mustAttendOfRemaining: number // remainingToHorizon - maxBunkSafe, clamped 0..remaining
  projectedPctIfMaxSafeBunk: number
  projectedPctIfAttendAll: number // (attendedSoFar+remaining)/total*100
  status: 'safe' | 'condonation' | 'detention'
}

// ─── boundary convention ──────────────────────────────────────────────────────

/**
 * When true, `referenceDate` ('today') is counted as already HELD, and
 * `remaining` begins the day AFTER referenceDate. Flip this single constant to
 * change the past/future boundary behaviour everywhere.
 */
const INCLUDE_TODAY_IN_HELD = true

// ─── internal date helpers (UTC only, string-compared) ────────────────────────

const DAY_MS = 86_400_000

/** Parse 'YYYY-MM-DD' to a UTC-midnight timestamp (ms). No local-tz parsing. */
function toUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

/** Format a UTC timestamp back to 'YYYY-MM-DD'. */
function fmt(ts: number): string {
  const d = new Date(ts)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function weekdayOf(ts: number): Weekday {
  return new Date(ts).getUTCDay() as Weekday
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

// ─── engine ───────────────────────────────────────────────────────────────────

export function computeBunk(input: BunkInput): BunkResult {
  const { semester, slots, holidays, missed, referenceDate } = input
  const horizon = input.horizonDate ?? semester.end_date

  // slots scheduled per weekday
  const slotsByWeekday: Record<number, number> = {}
  for (const s of slots) {
    slotsByWeekday[s.weekday] = (slotsByWeekday[s.weekday] ?? 0) + 1
  }
  const slotsOn = (ts: number) => slotsByWeekday[weekdayOf(ts)] ?? 0

  const holidaySet = new Set(holidays)

  const startTs = toUTC(semester.start_date)
  const endTs = toUTC(semester.end_date)
  const refTs = toUTC(referenceDate)
  const horizonTs = toUTC(horizon)

  /** Sum of working slots over the inclusive date range [fromTs, toTs]. */
  function countSlots(fromTs: number, toTs: number): number {
    if (toTs < fromTs) return 0
    let total = 0
    for (let t = fromTs; t <= toTs; t += DAY_MS) {
      const n = slotsOn(t)
      if (n === 0) continue // weekday has no classes
      if (holidaySet.has(fmt(t))) continue // holiday
      total += n
    }
    return total
  }

  // Boundary: held includes referenceDate; remaining starts the day after.
  const heldEndTs = Math.min(INCLUDE_TODAY_IN_HELD ? refTs : refTs - DAY_MS, endTs)
  const remainStartTs = heldEndTs + DAY_MS
  const remainEndTs = Math.min(horizonTs, endTs)

  const heldSoFar = countSlots(startTs, heldEndTs)
  const remainingToHorizon = countSlots(remainStartTs, remainEndTs)

  // Missed periods: only valid working days inside [start, heldEnd].
  // De-duplicate identical (date, slot_id) pairs; cap per-date at slots that day.
  const byDate = new Map<string, Set<string>>()
  for (const m of missed) {
    const ts = toUTC(m.missed_date)
    if (ts < startTs || ts > heldEndTs) continue // out of held range
    if (slotsOn(ts) === 0) continue // non-scheduled weekday
    if (holidaySet.has(m.missed_date)) continue // holiday
    const key = m.slot_id === null ? 'null' : m.slot_id
    let set = byDate.get(m.missed_date)
    if (!set) {
      set = new Set<string>()
      byDate.set(m.missed_date, set)
    }
    set.add(key)
  }
  let missedCount = 0
  for (const [date, set] of byDate) {
    missedCount += Math.min(set.size, slotsOn(toUTC(date)))
  }

  const attendedSoFar = Math.max(0, heldSoFar - missedCount)
  const currentPct = heldSoFar === 0 ? 0 : (attendedSoFar / heldSoFar) * 100

  const totalToHorizon = heldSoFar + remainingToHorizon

  /**
   * Most future periods you can skip and still finish at >= T%.
   * final attended = attendedSoFar + (remaining - bunk)
   * (final/total) >= T/100  ⟹  bunk <= attendedSoFar + remaining - (T/100)*total
   * Returns the RAW (possibly negative) floored value for status decisions.
   */
  const rawMaxBunk = (T: number) =>
    Math.floor(attendedSoFar + remainingToHorizon - (T / 100) * totalToHorizon)

  const rawSafe = rawMaxBunk(semester.required_pct)
  const rawFloor = rawMaxBunk(semester.floor_pct)

  const maxBunkSafe = clamp(rawSafe, 0, remainingToHorizon)
  const maxBunkFloor = clamp(rawFloor, 0, remainingToHorizon)
  const mustAttendOfRemaining = clamp(
    remainingToHorizon - maxBunkSafe,
    0,
    remainingToHorizon,
  )

  const projectedPctIfMaxSafeBunk =
    totalToHorizon === 0
      ? 0
      : ((attendedSoFar + remainingToHorizon - maxBunkSafe) / totalToHorizon) * 100

  const projectedPctIfAttendAll =
    totalToHorizon === 0
      ? 0
      : ((attendedSoFar + remainingToHorizon) / totalToHorizon) * 100

  let status: BunkResult['status']
  if (rawSafe >= 0) {
    status = 'safe'
  } else if (projectedPctIfAttendAll >= semester.floor_pct) {
    status = 'condonation'
  } else {
    status = 'detention'
  }

  return {
    heldSoFar,
    missedCount,
    attendedSoFar,
    currentPct,
    remainingToHorizon,
    totalToHorizon,
    maxBunkSafe,
    maxBunkFloor,
    mustAttendOfRemaining,
    projectedPctIfMaxSafeBunk,
    projectedPctIfAttendAll,
    status,
  }
}
