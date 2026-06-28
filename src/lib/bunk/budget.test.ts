/**
 * Unit tests for the Bunk budget projection.
 *
 * Run with Node's built-in test runner (Node 24 strips TS types natively):
 *   node --test src/lib/bunk/budget.test.ts
 *   npm run test:unit
 *
 * No external test framework, no new npm packages.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeBunkBudget } from './budget.ts'
import { INSTRUCTION_END } from './sectionH.ts'

// Anchor `today` near the end of the instruction period so `remaining` is small
// and hand-countable:
//   INSTRUCTION_END = 2026-10-24 (Saturday).
//   today = 2026-10-22 (Thursday). Dussehra (Oct 19/20/21) is already past.
//   strictly-after-today working days through END:
//     Oct 23 (Fri) = 5  +  Oct 24 (Sat) = 5   =>  remaining = 10
const TODAY = '2026-10-22'
const REMAINING_AFTER_TODAY = 10

// ─── 1. total = 0 (fresh snapshot) ──────────────────────────────────────────────

test('total=0: currentPct=0, detention, finalTotal===remaining, bunkable within bounds', () => {
  const r = computeBunkBudget({ present: 0, total: 0, today: '2026-06-21' })

  assert.equal(r.currentPct, 0)
  assert.equal(r.zone, 'detention')
  // today is before INSTRUCTION_START, so the whole period is still ahead.
  assert.ok(r.remaining > 0, `remaining=${r.remaining}`)
  assert.equal(r.finalTotal, r.remaining) // total=0
  assert.ok(r.bunkableAt75 >= 0 && r.bunkableAt75 <= r.remaining)
  assert.ok(r.bunkableAt65 >= 0 && r.bunkableAt65 <= r.remaining)
  // condonation cushion is never stricter than the 75% budget.
  assert.ok(r.bunkableAt65 >= r.bunkableAt75)
})

// ─── 2. mid-semester snapshot (comfortably safe) ────────────────────────────────

test('mid-sem 80/100: safe, exact remaining + bunkable + days breakdown', () => {
  const r = computeBunkBudget({ present: 80, total: 100, today: TODAY })

  assert.equal(r.remaining, REMAINING_AFTER_TODAY)
  assert.equal(r.finalTotal, 110)
  assert.ok(Math.abs(r.currentPct - 80) < 1e-9)
  assert.equal(r.zone, 'safe')

  // bunkableAt75 = floor(80 + 10 - 0.75*110) = floor(7.5) = 7
  assert.equal(r.bunkableAt75, 7)
  // bunkableAt65 = floor(80 + 10 - 0.65*110) = floor(18.5)=18 -> clamp 0..10 = 10
  assert.equal(r.bunkableAt65, 10)

  // budget 7: Oct 23 Fri(5) taken whole -> 2 left; Oct 24 Sat(5) can't -> partial.
  assert.deepEqual(r.daysAt75, { days: 1, periods: 2 })
})

// ─── 3. already below 75 (detention) ────────────────────────────────────────────

test('below-75 60/100: detention, zero bunkable, empty days breakdown', () => {
  const r = computeBunkBudget({ present: 60, total: 100, today: TODAY })

  assert.equal(r.remaining, REMAINING_AFTER_TODAY)
  assert.ok(Math.abs(r.currentPct - 60) < 1e-9)
  assert.equal(r.zone, 'detention')

  // bunkableAt75 = floor(60+10-82.5) = -13 -> clamp 0
  assert.equal(r.bunkableAt75, 0)
  // bunkableAt65 = floor(60+10-71.5) = -2  -> clamp 0
  assert.equal(r.bunkableAt65, 0)
  assert.deepEqual(r.daysAt75, { days: 0, periods: 0 })
})

// ─── 4. condonation band (65 <= pct < 75) ───────────────────────────────────────

test('70/100: condonation zone', () => {
  const r = computeBunkBudget({ present: 70, total: 100, today: TODAY })
  assert.ok(Math.abs(r.currentPct - 70) < 1e-9)
  assert.equal(r.zone, 'condonation')
})

// ─── 5. sanity: today on/after END leaves nothing remaining ──────────────────────

test('today === INSTRUCTION_END: remaining=0, finalTotal===total', () => {
  const r = computeBunkBudget({ present: 90, total: 100, today: INSTRUCTION_END })
  assert.equal(r.remaining, 0)
  assert.equal(r.finalTotal, 100)
  assert.equal(r.bunkableAt75, 0)
  assert.deepEqual(r.daysAt75, { days: 0, periods: 0 })
})
