/**
 * Unit tests for the Bunk Calculator engine.
 *
 * Run with Node's built-in test runner (Node 24 strips TS types natively):
 *   node --test src/lib/bunk/calc.test.ts
 *   npm run test:unit
 *
 * No external test framework, no new npm packages.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeBunk, type Slot, type MissedEntry } from './calc.ts'

// ─── fixtures ──────────────────────────────────────────────────────────────────

// Mon–Fri timetable, 5 slots per day. weekday: 1=Mon .. 5=Fri.
// Slot ids: `${weekday}-${position}` e.g. "2-3" = Tuesday, period 3.
function monFriFiveSlots(): Slot[] {
  const slots: Slot[] = []
  for (let wd = 1; wd <= 5; wd++) {
    for (let pos = 1; pos <= 5; pos++) {
      slots.push({ id: `${wd}-${pos}`, weekday: wd as Slot['weekday'], position: pos })
    }
  }
  return slots
}

// All 5 slots missed on a given date (weekday 1..5). Whole-day absence.
function missAllSlotsOn(date: string, weekday: number): MissedEntry[] {
  return Array.from({ length: 5 }, (_, i) => ({
    missed_date: date,
    slot_id: `${weekday}-${i + 1}`,
  }))
}

// Anchor calendar.
// 2026-01-01 is a Thursday, so 2026-01-05 is a Monday.
// Working days (Mon–Fri), start 2026-01-05:
//   wk1: Jan 5,6,7,8,9      (5)
//   wk2: Jan 12,13,14,15,16 (5)
//   wk3: Jan 19,20 -> ref   (2)   => 12 days * 5 = 60 held
//   then Jan 21,22,23       (3)
//   wk4: Jan 26,27,28,29,30 (5)   => 8 days * 5 = 40 remaining
const SEM = {
  start_date: '2026-01-05',
  end_date: '2026-01-30',
  required_pct: 75,
  floor_pct: 65,
}
const REF = '2026-01-20' // held boundary (inclusive)

// ─── 1. Anchor case ─────────────────────────────────────────────────────────────

test('anchor: held=60, remaining=40, missed=10 -> 83.33%, safe', () => {
  // Miss all of Tue Jan 6 (wd2) and all of Wed Jan 7 (wd3) = 10 slots.
  const missed = [...missAllSlotsOn('2026-01-06', 2), ...missAllSlotsOn('2026-01-07', 3)]

  const r = computeBunk({
    semester: SEM,
    slots: monFriFiveSlots(),
    holidays: [],
    missed,
    referenceDate: REF, // horizon defaults to end_date = Jan 30
  })

  assert.equal(r.heldSoFar, 60)
  assert.equal(r.remainingToHorizon, 40)
  assert.equal(r.missedCount, 10)
  assert.equal(r.attendedSoFar, 50)
  assert.equal(r.totalToHorizon, 100)
  assert.ok(Math.abs(r.currentPct - 83.3333) < 0.01, `currentPct=${r.currentPct}`)
  assert.equal(r.maxBunkSafe, 15)
  assert.equal(r.maxBunkFloor, 25)
  assert.equal(r.mustAttendOfRemaining, 25)
  assert.equal(r.status, 'safe')
})

// ─── 2. Partial-day miss ────────────────────────────────────────────────────────

test('partial day: two slot rows on one date -> missedCount=2', () => {
  const missed: MissedEntry[] = [
    { missed_date: '2026-01-06', slot_id: '2-1' },
    { missed_date: '2026-01-06', slot_id: '2-3' },
  ]
  const r = computeBunk({
    semester: SEM,
    slots: monFriFiveSlots(),
    holidays: [],
    missed,
    referenceDate: REF,
  })
  assert.equal(r.missedCount, 2)

  // Duplicate identical (date, slot_id) pairs collapse to one.
  const rDup = computeBunk({
    semester: SEM,
    slots: monFriFiveSlots(),
    holidays: [],
    missed: [...missed, { missed_date: '2026-01-06', slot_id: '2-1' }],
    referenceDate: REF,
  })
  assert.equal(rDup.missedCount, 2)
})

// ─── 3. Whole-day miss ──────────────────────────────────────────────────────────

test('whole day: all 5 slot rows present -> missedCount=5 (capped at slots that day)', () => {
  const r = computeBunk({
    semester: SEM,
    slots: monFriFiveSlots(),
    holidays: [],
    missed: missAllSlotsOn('2026-01-06', 2),
    referenceDate: REF,
  })
  assert.equal(r.missedCount, 5)

  // Over-supplying rows (e.g. a stray null) cannot exceed slots scheduled that day.
  const rOver = computeBunk({
    semester: SEM,
    slots: monFriFiveSlots(),
    holidays: [],
    missed: [...missAllSlotsOn('2026-01-06', 2), { missed_date: '2026-01-06', slot_id: null }],
    referenceDate: REF,
  })
  assert.equal(rOver.missedCount, 5)
})

// ─── 4. Holiday reduces heldSoFar ───────────────────────────────────────────────

test('holiday inside range reduces heldSoFar by that day’s slots', () => {
  const base = computeBunk({
    semester: SEM,
    slots: monFriFiveSlots(),
    holidays: [],
    missed: [],
    referenceDate: REF,
  })
  const withHoliday = computeBunk({
    semester: SEM,
    slots: monFriFiveSlots(),
    holidays: ['2026-01-06'], // a Tuesday in the held range (5 slots)
    missed: [],
    referenceDate: REF,
  })
  assert.equal(base.heldSoFar, 60)
  assert.equal(withHoliday.heldSoFar, 55)
  assert.ok(withHoliday.heldSoFar < base.heldSoFar)
})

// ─── 5. Detention ───────────────────────────────────────────────────────────────

test('detention: projectedPctIfAttendAll < floor', () => {
  // Miss 8 whole days = 40 slots. held=60 -> attended=20, remaining=40, total=100.
  // projectedIfAttendAll = (20+40)/100 = 60 < 65.
  const missed = [
    ...missAllSlotsOn('2026-01-05', 1),
    ...missAllSlotsOn('2026-01-06', 2),
    ...missAllSlotsOn('2026-01-07', 3),
    ...missAllSlotsOn('2026-01-08', 4),
    ...missAllSlotsOn('2026-01-09', 5),
    ...missAllSlotsOn('2026-01-12', 1),
    ...missAllSlotsOn('2026-01-13', 2),
    ...missAllSlotsOn('2026-01-14', 3),
  ]
  const r = computeBunk({
    semester: SEM,
    slots: monFriFiveSlots(),
    holidays: [],
    missed,
    referenceDate: REF,
  })
  assert.equal(r.missedCount, 40)
  assert.equal(r.attendedSoFar, 20)
  assert.ok(Math.abs(r.projectedPctIfAttendAll - 60) < 0.001)
  assert.equal(r.maxBunkSafe, 0)
  assert.equal(r.status, 'detention')
})

// ─── 6. Condonation ─────────────────────────────────────────────────────────────

test('condonation: floor <= projectedPctIfAttendAll < required, rawMaxBunk(required) < 0', () => {
  // Miss 6 whole days = 30 slots. held=60 -> attended=30, remaining=40, total=100.
  // projectedIfAttendAll = (30+40)/100 = 70  (between 65 and 75)
  // rawMaxBunk(75) = floor(30+40-75) = -5 < 0 -> not safe.
  const missed = [
    ...missAllSlotsOn('2026-01-05', 1),
    ...missAllSlotsOn('2026-01-06', 2),
    ...missAllSlotsOn('2026-01-07', 3),
    ...missAllSlotsOn('2026-01-08', 4),
    ...missAllSlotsOn('2026-01-09', 5),
    ...missAllSlotsOn('2026-01-12', 1),
  ]
  const r = computeBunk({
    semester: SEM,
    slots: monFriFiveSlots(),
    holidays: [],
    missed,
    referenceDate: REF,
  })
  assert.equal(r.missedCount, 30)
  assert.equal(r.attendedSoFar, 30)
  assert.ok(Math.abs(r.projectedPctIfAttendAll - 70) < 0.001)
  assert.equal(r.maxBunkSafe, 0) // clamped from raw -5
  assert.equal(r.status, 'condonation')
})

// ─── 7. Edge: referenceDate before start ────────────────────────────────────────

test('edge: reference before start -> heldSoFar=0, currentPct=0, no crash', () => {
  const r = computeBunk({
    semester: SEM,
    slots: monFriFiveSlots(),
    holidays: [],
    missed: [],
    referenceDate: '2026-01-01', // before start (Jan 5)
  })
  assert.equal(r.heldSoFar, 0)
  assert.equal(r.currentPct, 0)
  assert.equal(r.attendedSoFar, 0)
})

// ─── 8. Edge: horizon before reference ──────────────────────────────────────────

test('edge: horizon before reference -> remaining=0', () => {
  const r = computeBunk({
    semester: SEM,
    slots: monFriFiveSlots(),
    holidays: [],
    missed: [],
    referenceDate: REF, // Jan 20
    horizonDate: '2026-01-10', // before reference
  })
  assert.equal(r.remainingToHorizon, 0)
})
