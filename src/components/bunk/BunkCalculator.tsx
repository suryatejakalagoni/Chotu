'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { computeBunkBudget, type DaysBreakdown } from '@/lib/bunk/budget'
import { PORTAL_URL } from '@/lib/bunk/sectionH'

const LS_KEY = 'chotu-bunk-snapshot'

/** Today in IST as 'YYYY-MM-DD' (sv-SE formats as ISO date). */
function todayIST(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(
    new Date(),
  )
}

/** Trim trailing ".0" — 80.0 → "80", 83.33 → "83.3". */
function fmtPct(pct: number): string {
  return (pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)) + '%'
}

/** "1 day + 2 periods" style human string from a DaysBreakdown. */
function fmtDays({ days, periods }: DaysBreakdown): string {
  const parts: string[] = []
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`)
  if (periods > 0) parts.push(`${periods} period${periods === 1 ? '' : 's'}`)
  return parts.length ? parts.join(' + ') : 'no spare classes'
}

const ZONE_STYLES: Record<string, { text: string; label: string }> = {
  safe: { text: 'text-green-600 dark:text-green-500', label: 'Safe' },
  condonation: { text: 'text-amber-600 dark:text-amber-500', label: 'Condonation zone' },
  detention: { text: 'text-red-600 dark:text-red-500', label: 'Detention risk' },
}

export function BunkCalculator() {
  // Raw input strings (empty = not yet entered). localStorage is read ONLY in
  // the effect below — never during render — to avoid a hydration mismatch.
  const [presentStr, setPresentStr] = useState('')
  const [totalStr, setTotalStr] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  // Load any saved snapshot once, on the client.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LS_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as { present?: string; total?: string }
        if (typeof saved.present === 'string') setPresentStr(saved.present)
        if (typeof saved.total === 'string') setTotalStr(saved.total)
      }
    } catch {
      // ignore malformed/blocked storage
    }
    setHydrated(true)
  }, [])

  // Persist on change (only after the initial load, so we don't clobber it).
  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(
        LS_KEY,
        JSON.stringify({ present: presentStr, total: totalStr }),
      )
    } catch {
      // ignore blocked storage
    }
  }, [presentStr, totalStr, hydrated])

  // ── validation ──────────────────────────────────────────────────────────────
  const present = Number(presentStr)
  const total = Number(totalStr)
  const presentEntered = presentStr.trim() !== ''
  const totalEntered = totalStr.trim() !== ''

  const isInt = (s: string, n: number) => s.trim() !== '' && Number.isInteger(n) && n >= 0

  let error: string | null = null
  if (presentEntered && !isInt(presentStr, present)) {
    error = 'Present must be a whole number (0 or more).'
  } else if (totalEntered && !isInt(totalStr, total)) {
    error = 'Total must be a whole number (0 or more).'
  } else if (presentEntered && totalEntered && present > total) {
    error = 'Present classes cannot be more than total classes.'
  }

  const validNumbers =
    !error && presentEntered && totalEntered && isInt(presentStr, present) && isInt(totalStr, total)

  const result = useMemo(() => {
    if (!validNumbers) return null
    return computeBunkBudget({ present, total, today: todayIST() })
  }, [validNumbers, present, total])

  // total === 0 guard: show 0% + a prompt instead of a budget.
  const showBudget = result !== null && total > 0
  const zone = result ? ZONE_STYLES[result.zone] : null

  return (
    <main className="mx-auto max-w-md px-4 py-6 space-y-5">
      <div>
        <h1 className="font-heading text-xl font-semibold">Bunk Calculator</h1>
        <p className="text-sm text-muted-foreground">
          Enter your iLMS attendance to see how many classes you can still skip.
        </p>
      </div>

      {/* ── Inputs ──────────────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="present">Present Classes</Label>
              <Input
                id="present"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="e.g. 142"
                value={presentStr}
                onChange={(e) => setPresentStr(e.target.value)}
                aria-invalid={error ? true : undefined}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="total">Total Classes</Label>
              <Input
                id="total"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                placeholder="e.g. 170"
                value={totalStr}
                onChange={(e) => setTotalStr(e.target.value)}
                aria-invalid={error ? true : undefined}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Current % readout — always shown; 0% when total is 0. */}
          <div className="flex items-baseline justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Current attendance</span>
            <span
              className={cn(
                'font-heading text-4xl font-bold tabular-nums',
                zone ? zone.text : 'text-muted-foreground',
              )}
            >
              {result ? fmtPct(result.currentPct) : '0%'}
            </span>
          </div>
          {zone && (
            <p className={cn('text-right text-sm font-medium', zone.text)}>
              {zone.label}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Result / prompt ─────────────────────────────────────────────────── */}
      {showBudget && result ? (
        <Card>
          <CardContent className="space-y-2">
            <p className="text-base leading-relaxed">
              You can bunk up to{' '}
              <span className="font-semibold text-green-600 dark:text-green-500">
                {result.bunkableAt75}
              </span>{' '}
              more class{result.bunkableAt75 === 1 ? '' : 'es'} (~
              {fmtDays(result.daysAt75)}) and stay above 75%.
            </p>
            <p className="text-sm text-muted-foreground">
              {result.bunkableAt65} class{result.bunkableAt65 === 1 ? '' : 'es'} if
              you use the 65% condonation cushion.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Enter your numbers from iLMS to see your budget.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── How to use (collapsible) ────────────────────────────────────────── */}
      <Card>
        <CardContent className="space-y-3">
          <button
            type="button"
            onClick={() => setHelpOpen((o) => !o)}
            aria-expanded={helpOpen}
            className="flex w-full items-center justify-between text-left font-medium"
          >
            <span>How to use</span>
            <span className="text-muted-foreground">{helpOpen ? '▾' : '▸'}</span>
          </button>

          {helpOpen && (
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                Open your iLMS portal:{' '}
                <a
                  href={PORTAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-2"
                >
                  {PORTAL_URL}
                </a>{' '}
                and log in.
              </li>
              {/* TODO(Surya): confirm the exact iLMS menu path where the
                  cumulative Present / Total session counts appear, and spell
                  it out here (e.g. "Attendance → Summary"). */}
              <li>
                Find your attendance — note <b>Present Classes</b> and{' '}
                <b>Total Classes</b> (the cumulative class counts, not the
                subject-wise %).
              </li>
              <li>Type both numbers above.</li>
              <li>
                CHOTU shows your current attendance and how many upcoming classes
                you can still skip while staying above 75%.
              </li>
            </ol>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setPresentStr('')
            setTotalStr('')
          }}
        >
          Clear
        </Button>
      </div>
    </main>
  )
}
