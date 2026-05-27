'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { ChotuOwl } from '@/components/chotu/ChotuOwl'
import { useChotuActions } from '@/components/chotu/ChotuStage'
import { addExpense, deleteExpense, updateExpense } from '@/lib/actions/expenses'

// ─── types ─────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; color: string | null; icon: string | null; type: string | null }

export type ExpenseItem = {
  id: string
  title: string
  amount: number
  category_id: string | null
  payment_method: string
  spent_at: string
  notes: string | null
}

// ─── constants ──────────────────────────────────────────────────────────────────

const GLYPH_MAP: Record<string, string> = {
  Food: '🍜', Transport: '🚌', Books: '📚', Coffee: '☕',
  Stationery: '✏️', Movie: '🎬', Tea: '🍵', Phone: '📱',
  Snacks: '🧆', Groceries: '🛒', Misc: '•',
}
const COLOR_MAP: Record<string, string> = {
  Food: '#f97316', Transport: '#3b82f6', Books: '#8b5cf6',
  Coffee: '#a16207', Stationery: '#10b981', Movie: '#ec4899',
  Tea: '#d97706', Phone: '#06b6d4', Snacks: '#f59e0b',
  Groceries: '#84cc16', Misc: '#64748b',
}
const PAY_META: Record<string, { label: string; glyph: string }> = {
  upi: { label: 'UPI', glyph: '◈' },
  cash: { label: 'Cash', glyph: '₹' },
  card: { label: 'Card', glyph: '▭' },
  wallet: { label: 'Wallet', glyph: '◐' },
  netbanking: { label: 'Net Banking', glyph: '⊟' },
  other: { label: 'Other', glyph: '○' },
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function hexToSoft(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r},${g},${b},0.15)`
}

function catDisplay(cat: Category | null | undefined) {
  if (!cat) return { color: '#64748b', glyph: '•', soft: 'rgba(100,116,139,0.15)' }
  const color = cat.color ?? COLOR_MAP[cat.name] ?? '#64748b'
  const glyph = cat.icon ?? GLYPH_MAP[cat.name] ?? '•'
  return { color, glyph, soft: hexToSoft(color) }
}

// ─── Intl formatters — pinned locale + timeZone ──────────────────────────────
// Both locale ('en-IN') and timeZone ('Asia/Kolkata') are explicit so Vercel's
// Node.js and Chrome's V8 produce byte-for-byte identical strings.
// Constructed once at module level (not inside render) for performance.
const _FMT_SHORT = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
})
const _FMT_DOW_LONG = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'long',
  day: 'numeric',
  month: 'short',
})
const _FMT_MONTH = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  month: 'short',
})
const _FMT_MONTH_LONG = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  month: 'long',
})
const _FMT_DOW_SHORT = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

// Parse 'YYYY-MM-DD' as UTC midnight — deterministic regardless of server/client tz.
// new Date('YYYY-MM-DD') already parses as UTC midnight per spec, but being
// explicit avoids any engine quirk and makes the intent clear.
function isoToUTC(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function fmtDateShort(iso: string): string {
  return _FMT_SHORT.format(isoToUTC(iso)) // e.g. "28 Apr"
}
function fmtDateDow(iso: string): string {
  return _FMT_DOW_LONG.format(isoToUTC(iso)) // e.g. "Sunday, 28 Apr"
}

// 0=Sun…6=Sat via Tomohiko Sakamoto — pure math, no Date object, no tz dependency.
// Used for weekend bar styling in the chart (can't get numeric dow from Intl easily).
function dowOf(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const mi = m - 1 // 0-indexed month for algorithm
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
  const yr = mi < 2 ? y - 1 : y
  return (yr + Math.floor(yr/4) - Math.floor(yr/100) + Math.floor(yr/400) + t[mi] + d) % 7
}

function fmtMoney(n: number): string {
  const r = Math.round(n)
  const abs = Math.abs(r)
  const s = String(abs)
  // Indian grouping: last 3 digits, then pairs of 2 from the right.
  // Pure regex — no Intl, no locale dependency.
  const formatted = s.length <= 3 ? s
    : s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3)
  return (r < 0 ? '-₹' : '₹') + formatted
}
function dayKey(iso: string): string {
  return iso.slice(0, 10) // TZ-neutral date key
}
// dayLabel uses new Date() for today/yesterday — genuinely runtime-dependent.
// The caller suppresses the hydration warning on the element that renders this.
function dayLabel(iso: string): string {
  const dStr = iso.slice(0, 10)
  // Get today/yesterday in IST so the comparison matches what the user sees
  const istFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }) // sv-SE → YYYY-MM-DD
  const todayStr = istFmt.format(new Date())
  const yest = new Date(); yest.setDate(yest.getDate() - 1)
  const yestStr = istFmt.format(yest)
  if (dStr === todayStr) return 'Today'
  if (dStr === yestStr) return 'Yesterday'
  return fmtDateDow(iso)
}

// ─── donut chart ──────────────────────────────────────────────────────────────

function polar(cx: number, cy: number, r: number, angle: number) {
  const a = (angle - 90) * Math.PI / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}
function arcPath(cx: number, cy: number, r: number, startA: number, endA: number) {
  const a1 = Math.min(endA, startA + 359.999)
  const s = polar(cx, cy, r, startA)
  const e = polar(cx, cy, r, a1)
  const largeArc = a1 - startA > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
}

type DonutDatum = { name: string; value: number; color: string }
function DonutChart({ data, size = 220, selected, onSelect }: {
  data: DonutDatum[]; size?: number; selected: string | null; onSelect: (name: string) => void
}) {
  const stroke = 38
  const r = (size - stroke - 6) / 2
  const cx = size / 2, cy = size / 2
  const total = data.reduce((t, d) => t + d.value, 0)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t) }, [])

  let acc = 0
  const segs = data.map(d => {
    const startA = acc
    const sweep = (d.value / total) * 360
    acc += sweep
    return { ...d, startA, sweep }
  })

  return (
    <div className="donut-wrap">
      <svg className="donut-svg" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={stroke} />
        {segs.map(s => {
          const visSweep = mounted ? s.sweep : 0
          if (visSweep <= 0.01) return null
          const gap = segs.length > 1 ? 1.4 : 0
          const endA = s.startA + visSweep - gap
          if (endA - s.startA < 0.3) return null
          const isSel = selected === s.name
          const isOther = selected && !isSel
          return (
            <g key={s.name} className="seg-group" onClick={() => onSelect(s.name)}
              style={{ cursor: 'pointer', transition: 'opacity .25s' }}>
              <path
                d={arcPath(cx, cy, r, s.startA, endA)}
                stroke={s.color}
                strokeWidth={isSel ? stroke + 6 : stroke}
                fill="none"
                strokeLinecap="butt"
                opacity={isOther ? 0.28 : 1}
                style={{ transition: 'stroke-width .25s, opacity .25s' }}
              >
                <title>{s.name} · {fmtMoney(s.value)} ({Math.round(s.value / total * 100)}%)</title>
              </path>
            </g>
          )
        })}
        <text x={cx} y={cy - 2} textAnchor="middle"
          style={{ fontFamily: 'Clash Display,sans-serif', fontWeight: 700, fontSize: 28, fill: 'var(--fg-0)' }}>
          {fmtMoney(total)}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle"
          style={{ fontFamily: 'monospace', fontSize: 9, fill: 'var(--fg-3)', letterSpacing: '0.2em' }}>
          THIS MONTH
        </text>
      </svg>
      <div className="donut-legend">
        {data.slice(0, 6).map(d => {
          const isSel = selected === d.name
          return (
            <div key={d.name} className={`row${isSel ? ' active' : ''}`} onClick={() => onSelect(d.name)}
              style={{ cursor: 'pointer' }}>
              <span className="dot" style={{ background: d.color }} />
              <span className="name">{d.name}</span>
              <span className="amt">{fmtMoney(d.value)}</span>
              <span className="pct">{Math.round(d.value / total * 100)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── bar chart ────────────────────────────────────────────────────────────────

type BarDay = { date: string; total: number }
function BarChart({ days }: { days: BarDay[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(680)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!wrapRef.current) return
    const update = () => {
      const w = wrapRef.current?.clientWidth
      if (w && Math.abs(w - W) > 4) setW(w)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [W])

  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t) }, [])

  const H = 180, PADL = 36, PADR = 10, PADT = 22, PADB = 26
  const innerW = Math.max(50, W - PADL - PADR)
  const innerH = H - PADT - PADB
  const max = Math.max(1, ...days.map(d => d.total))
  const slotW = innerW / Math.max(1, days.length)
  const barW = Math.max(2, slotW - 3)
  const yScale = (v: number) => PADT + innerH - (v / max) * innerH
  const peakIdx = days.reduce((p, d, i) => d.total > days[p].total ? i : p, 0)
  const ticks = 4
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (max * i) / ticks)
  const labelStride = Math.max(1, Math.ceil(days.length / 6))

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg className="bar-svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {tickVals.map((v, i) => (
          <g key={i}>
            <line className="axis-line" x1={PADL} y1={yScale(v)} x2={W - PADR} y2={yScale(v)} />
            <text className="axis-text" x={PADL - 6} y={yScale(v) + 3} textAnchor="end">{fmtMoney(v)}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = PADL + i * slotW + (slotW - barW) / 2
          const h = mounted ? (d.total / max) * innerH : 0
          const y = PADT + innerH - h
          const isPeak = i === peakIdx && d.total > 0
          const dow = dowOf(d.date)
          const weekend = dow === 0 || dow === 6
          return (
            <g key={d.date}>
              <rect
                className={`bar${weekend ? ' weekend' : ''}`}
                x={x} y={y} width={barW} height={h} rx={Math.min(3, barW / 2)}
                style={{ transition: `y .8s var(--ease-out,ease) ${i * 12}ms, height .8s var(--ease-out,ease) ${i * 12}ms` }}
              >
                <title>{fmtDateShort(d.date)} · {fmtMoney(d.total)}</title>
              </rect>
              {isPeak && mounted && (
                <g transform={`translate(${x + barW / 2} ${y - 8})`}>
                  <rect className="peak-flag" x={-26} y={-16} width={52} height={18} rx="9" />
                  <text textAnchor="middle" y={-3}
                    style={{ fontFamily: 'monospace', fontSize: 10, fill: 'var(--accent)', fontWeight: 600 }}>
                    PEAK
                  </text>
                </g>
              )}
            </g>
          )
        })}
        {days.map((d, i) => i % labelStride === 0 && (
          <text key={'l' + i} className="axis-text"
            x={PADL + i * slotW + slotW / 2} y={H - 10} textAnchor="middle">
            {fmtDateShort(d.date)}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ─── sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ values, color = 'var(--accent)' }: { values: number[]; color?: string }) {
  if (!values.length) return null
  const W = 100, H = 28
  const max = Math.max(1, ...values)
  const path = values.map((v, i) =>
    `${i === 0 ? 'M' : 'L'} ${(i / (values.length - 1)) * W} ${H - (v / max) * H}`
  ).join(' ')
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={path + ` L ${W} ${H} L 0 ${H} Z`} fill={color} opacity="0.2" />
      <path d={path} stroke={color} fill="none" strokeWidth="1.5" />
    </svg>
  )
}

// ─── counting owl ─────────────────────────────────────────────────────────────

function CountingOwl() {
  const [look, setLook] = useState({ x: 0, y: 0.7 })
  const [mood, setMood] = useState<'normal' | 'happy'>('normal')
  const [bubble, setBubble] = useState<string | null>(null)

  useEffect(() => {
    const states = [
      { look: { x: -0.5, y: 0.7 }, mood: 'normal' as const, bubble: '₹50…', ms: 2200 },
      { look: { x: 0.4, y: 0.7 }, mood: 'normal' as const, bubble: '₹100…', ms: 2200 },
      { look: { x: 0, y: 0.85 }, mood: 'normal' as const, bubble: '₹150…', ms: 2200 },
      { look: { x: 0, y: 0.7 }, mood: 'normal' as const, bubble: null, ms: 1400 },
      { look: { x: 0, y: -0.2 }, mood: 'happy' as const, bubble: 'rich!', ms: 1400 },
    ]
    let i = 0, alive = true
    function tick() {
      if (!alive) return
      const s = states[i % states.length]
      setLook(s.look); setMood(s.mood); setBubble(s.bubble)
      i++
      setTimeout(tick, s.ms)
    }
    tick()
    return () => { alive = false }
  }, [])

  return (
    <div className="counting-owl">
      {bubble && <div className="counting-bubble">{bubble}</div>}
      <ChotuOwl mood={mood} look={look} size={64} />
      <div className="coin-pile">
        <span className="coin c1">₹</span>
        <span className="coin c2">₹</span>
        <span className="coin c3">₹</span>
        <span className="coin c4">₹</span>
      </div>
    </div>
  )
}

// ─── expense row ──────────────────────────────────────────────────────────────

function ExpRow({ e, catById, onEdit, onDel }: {
  e: ExpenseItem
  catById: Map<string, Category>
  onEdit: (e: ExpenseItem) => void
  onDel: (id: string) => void
}) {
  const cat = e.category_id ? catById.get(e.category_id) : null
  const { color, glyph, soft } = catDisplay(cat)
  const pay = PAY_META[e.payment_method] ?? { label: e.payment_method, glyph: '○' }
  const catName = cat?.name ?? 'Misc'
  return (
    <div className="exp-row" onClick={() => onEdit(e)}>
      <span className="stripe" style={{ background: color }} />
      <span className="icon" style={{ background: soft, color }}>{glyph}</span>
      <div className="info">
        <div className="t">{e.title}</div>
        <div className="m">
          <span className="cat-pill" style={{ background: soft, color }}>{catName}</span>
          <span className="pay">{pay.glyph} {pay.label}</span>
          <span>{new Date(e.spent_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
        </div>
      </div>
      <div className="amt">−{fmtMoney(e.amount)}</div>
      <div className="actions" onClick={ev => ev.stopPropagation()}>
        <button onClick={() => onEdit(e)} title="Edit" aria-label="Edit">✎</button>
        <button className="del" onClick={() => onDel(e.id)} title="Delete" aria-label="Delete">✕</button>
      </div>
    </div>
  )
}

// ─── add / edit modal ─────────────────────────────────────────────────────────

function ExpenseModal({ categories, target, onClose, onSave, onError, onIdSwap }: {
  categories: Category[]
  target: ExpenseItem | null
  onClose: () => void
  onSave: (data: Omit<ExpenseItem, 'id'> & { id?: string }) => void
  /** Called (off main thread) when the background server action fails */
  onError: (id: string, msg: string) => void
  /** Called when server confirms the real DB id for an optimistic add */
  onIdSwap?: (tempId: string, realId: string) => void
}) {
  const [amount, setAmount] = useState(target ? String(target.amount) : '')
  const [title, setTitle] = useState(target?.title ?? '')
  const [catId, setCatId] = useState<string | null>(target?.category_id ?? null)
  const [payment, setPayment] = useState(target?.payment_method ?? 'upi')
  const [when, setWhen] = useState<'today' | 'yesterday' | 'custom'>('today')
  const [customDate, setCustomDate] = useState('')
  const [notes, setNotes] = useState(target?.notes ?? '')

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  async function submit() {
    if (!Number(amount) || !title.trim()) return
    let spent_at: string
    if (when === 'today') {
      spent_at = new Date().toISOString()
    } else if (when === 'yesterday') {
      const d = new Date(); d.setDate(d.getDate() - 1)
      spent_at = d.toISOString()
    } else {
      spent_at = customDate ? new Date(customDate).toISOString() : new Date().toISOString()
    }
    const payload = {
      title: title.trim(),
      amount: Number(amount),
      category_id: catId,
      payment_method: payment,
      spent_at,
      notes: notes.trim() || null,
    }

    // ── Optimistic: update UI immediately, server action runs in background ──
    const isAdd = !target
    const optimisticId = isAdd ? ('tmp_' + Date.now()) : target.id
    onSave({ ...payload, id: optimisticId })
    onClose()

    // Background persist — no await, UI is already updated
    void (async () => {
      const result = isAdd
        ? await addExpense({ ...payload })
        : await updateExpense(target.id, { ...payload })
      if (result.error) {
        onError(optimisticId, result.error)
        return
      }
      // Swap temp ID for real DB id on successful add
      if (isAdd && result.id) onIdSwap?.(optimisticId, result.id)
    })()
  }

  const validCats = categories.filter(c => c.type === 'expense' || !c.type)

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-add-exp" onClick={e => e.stopPropagation()}>
        <div className="pad-amt">
          <button className="icon-btn" onClick={onClose}
            style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30 }}
            aria-label="Close">✕</button>
          <div className="amt-label">{target ? 'Edit expense' : 'Amount'}</div>
          <div className="amt-display">
            <span className="cur">₹</span>
            <input
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={e => {
                const v = e.target.value.replace(/[^0-9.]/g, '')
                if ((v.match(/\./g) ?? []).length > 1) return
                setAmount(v)
              }}
              placeholder="0"
              className="amt-input"
            />
          </div>
          <div className="amt-rule" />
        </div>

        <div className="body">

          <div className="field">
            <label>What for?</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Maggi at canteen" />
          </div>

          <div className="field">
            <label>Category</label>
            <div className="cat-grid">
              {validCats.map(c => {
                const { color, glyph, soft } = catDisplay(c)
                return (
                  <div key={c.id}
                    className={`cat-tile${catId === c.id ? ' selected' : ''}`}
                    style={{ color }}
                    onClick={() => setCatId(id => id === c.id ? null : c.id)}>
                    <span className="glyph" style={{ background: soft }}>{glyph}</span>
                    <span className="lbl">{c.name}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {!target && (
            <div className="field">
              <label>When</label>
              <div className="date-chips">
                {(['today', 'yesterday', 'custom'] as const).map(w => (
                  <span key={w} className={`chip${when === w ? ' active' : ''}`} onClick={() => setWhen(w)}>
                    {w.charAt(0).toUpperCase() + w.slice(1)}
                  </span>
                ))}
              </div>
              {when === 'custom' && (
                <input type="datetime-local" value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  style={{ marginTop: 8, width: '100%' }} />
              )}
            </div>
          )}

          <div className="field">
            <label>Paid with</label>
            <div className="pay-row">
              {Object.entries(PAY_META).filter(([k]) => ['upi', 'cash', 'card', 'wallet'].includes(k)).map(([k, p]) => (
                <div key={k}
                  className={`pay-tile${payment === k ? ' selected' : ''}`}
                  onClick={() => setPayment(k)}>
                  <span style={{ fontSize: 16 }}>{p.glyph}</span> {p.label}
                </div>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Anything to remember?" />
          </div>
        </div>

        <div className="footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save"
            disabled={!Number(amount) || !title.trim()}
            onClick={submit}>
            {target ? `Update ${amount ? fmtMoney(Number(amount)) : ''}` : `Save ${amount && title ? fmtMoney(Number(amount)) : 'expense'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── toast helper ─────────────────────────────────────────────────────────────

type Toast = { id: number; msg: string; kind: string }
function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toasts">
      {toasts.map(t => (
        <div key={t.id} className={`toast${t.kind ? ' ' + t.kind : ''}`}>{t.msg}</div>
      ))}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  initialExpenses: ExpenseItem[]
  categories: Category[]
}

export function ExpensesClient({ initialExpenses, categories }: Props) {
  const chotu = useChotuActions()
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses)
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ExpenseItem | null>(null)
  // Snapshot held across the async background action so we can roll back on error
  const editSnapshotRef = useRef<ExpenseItem | null>(null)
  const [filterCat, setFilterCat] = useState<string | null>(null)
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth())
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [chartTab, setChartTab] = useState<'7d' | '30d' | '90d'>('30d')
  const [toasts, setToasts] = useState<Toast[]>([])

  const catById = useMemo(() => {
    const m = new Map<string, Category>()
    categories.forEach(c => m.set(c.id, c))
    return m
  }, [categories])

  const toast = (msg: string, kind = '') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500)
  }

  // ── derived month data ────────────────────────────────────────────────────

  const monthExp = useMemo(() =>
    expenses.filter(e => new Date(e.spent_at).getMonth() === filterMonth),
    [expenses, filterMonth]
  )

  const filtered = useMemo(() => {
    let r = monthExp
    if (filterCat) {
      const cat = categories.find(c => c.id === filterCat)
      if (cat) r = r.filter(e => e.category_id === filterCat)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(e => {
        const catName = e.category_id ? catById.get(e.category_id)?.name ?? '' : ''
        return e.title.toLowerCase().includes(q) || catName.toLowerCase().includes(q)
      })
    }
    r = [...r]
    if (sort === 'newest') r.sort((a, b) => new Date(b.spent_at).getTime() - new Date(a.spent_at).getTime())
    else if (sort === 'oldest') r.sort((a, b) => new Date(a.spent_at).getTime() - new Date(b.spent_at).getTime())
    else if (sort === 'big') r.sort((a, b) => b.amount - a.amount)
    else if (sort === 'small') r.sort((a, b) => a.amount - b.amount)
    return r
  }, [monthExp, filterCat, search, sort, catById, categories])

  const monthTotal = monthExp.reduce((t, e) => t + e.amount, 0)
  const txCount = monthExp.length
  const avgPerDay = txCount > 0 ? monthTotal / Math.max(1, new Date().getDate()) : 0
  const biggestSplurge = monthExp.reduce<ExpenseItem | null>((p, e) => e.amount > (p?.amount ?? 0) ? e : p, null)

  const catData = useMemo(() => {
    const m: Record<string, number> = {}
    monthExp.forEach(e => {
      const name = e.category_id ? catById.get(e.category_id)?.name ?? 'Misc' : 'Misc'
      m[name] = (m[name] ?? 0) + e.amount
    })
    return Object.entries(m)
      .map(([name, value]) => {
        const cat = categories.find(c => c.name === name)
        const color = cat?.color ?? COLOR_MAP[name] ?? '#64748b'
        return { name, value, color }
      })
      .sort((a, b) => b.value - a.value)
  }, [monthExp, catById, categories])

  const barData = useMemo(() => {
    const today = new Date()
    const N = chartTab === '7d' ? 7 : chartTab === '30d' ? 30 : 90
    return Array.from({ length: N }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (N - 1 - i))
      const key = d.toISOString().slice(0, 10)
      const total = expenses
        .filter(e => e.spent_at.slice(0, 10) === key)
        .reduce((t, e) => t + e.amount, 0)
      return { date: key, total }
    })
  }, [expenses, chartTab])

  const last7 = barData.slice(-7).map(d => d.total)

  const grouped = useMemo(() => {
    const m = new Map<string, ExpenseItem[]>()
    filtered.forEach(e => {
      const k = dayKey(e.spent_at)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(e)
    })
    return [...m.entries()].map(([k, items]) => ({
      key: k,
      label: dayLabel(items[0].spent_at),
      total: items.reduce((t, e) => t + e.amount, 0),
      items,
    }))
  }, [filtered])

  // ── available months (last 3) ─────────────────────────────────────────────

  const availableMonths = useMemo(() => {
    const now = new Date()
    return [2, 1, 0].map(offset => {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      return { month: d.getMonth(), label: _FMT_MONTH.format(d) }
    })
  }, [])

  // ── mutations ─────────────────────────────────────────────────────────────

  const handleAdd = (data: Omit<ExpenseItem, 'id'> & { id?: string }) => {
    const newExp: ExpenseItem = {
      id: data.id ?? 'tmp_' + Date.now(),
      title: data.title,
      amount: data.amount,
      category_id: data.category_id,
      payment_method: data.payment_method,
      spent_at: data.spent_at,
      notes: data.notes,
    }
    setExpenses(p => [newExp, ...p])
    toast(`Added ${fmtMoney(newExp.amount)} for ${newExp.title}`, 'success')
    if (newExp.amount >= 500) chotu?.react('surprised', `${fmtMoney(newExp.amount)}?!`)
    else if (newExp.amount >= 200) chotu?.react('happy', 'noted')
    else chotu?.celebrate('saved!')
  }

  const handleEdit = (data: Omit<ExpenseItem, 'id'> & { id?: string }) => {
    if (!data.id) return
    // Capture snapshot before overwriting — used by handleServerError for edit rollback
    editSnapshotRef.current = expenses.find(e => e.id === data.id) ?? null
    setExpenses(p => p.map(e => e.id === data.id ? { ...e, ...data, id: data.id! } : e))
    toast('Updated expense')
    chotu?.react('happy', 'updated!')
  }

  const handleDel = async (id: string) => {
    const prev = expenses.find(e => e.id === id)
    setExpenses(p => p.filter(e => e.id !== id))
    toast(`Removed ${prev?.title ?? 'expense'}`)
    chotu?.react('shy', 'erased')
    const result = await deleteExpense(id)
    if (result.error) {
      if (prev) setExpenses(p => [prev, ...p])
      toast(result.error ?? 'Could not delete', 'error')
    }
  }

  // ── background-action error rollback ─────────────────────────────────────

  const handleServerError = (id: string, msg: string) => {
    if (id.startsWith('tmp_')) {
      // Optimistic add failed — remove the temporary item
      setExpenses(p => p.filter(e => e.id !== id))
    } else {
      // Optimistic edit failed — restore the snapshot captured before editing
      const snap = editSnapshotRef.current
      if (snap && snap.id === id) {
        setExpenses(p => p.map(e => e.id === id ? snap : e))
        editSnapshotRef.current = null
      }
    }
    toast(msg, 'error')
  }

  const handleIdSwap = (tempId: string, realId: string) => {
    setExpenses(p => p.map(e => e.id === tempId ? { ...e, id: realId } : e))
  }

  const monthName = _FMT_MONTH_LONG.format(new Date(2024, filterMonth, 1))

  // ── filter by category name (for donut click) ────────────────────────────

  const [filterCatName, setFilterCatName] = useState<string | null>(null)

  const filteredByCatName = useMemo(() => {
    let r = filtered
    if (filterCatName) {
      r = r.filter(e => {
        const name = e.category_id ? catById.get(e.category_id)?.name ?? 'Misc' : 'Misc'
        return name === filterCatName
      })
    }
    return r
  }, [filtered, filterCatName, catById])

  const groupedFinal = useMemo(() => {
    const m = new Map<string, ExpenseItem[]>()
    filteredByCatName.forEach(e => {
      const k = dayKey(e.spent_at)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(e)
    })
    return [...m.entries()].map(([k, items]) => ({
      key: k,
      label: dayLabel(items[0].spent_at),
      total: items.reduce((t, e) => t + e.amount, 0),
      items,
    }))
  }, [filteredByCatName])

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <main className="exp-page">
        {/* HERO */}
        <section className="exp-hero">
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1>Expenses.</h1>
            <p className="sub">
              You&apos;ve spent <span className="hl">{fmtMoney(monthTotal)}</span> across {txCount}{' '}
              {txCount === 1 ? 'thing' : 'things'} this {monthName}.
            </p>
          </div>
          <button className="add-fab" onClick={() => setAddOpen(true)}>
            <span className="plus">+</span>
            Add expense
          </button>
        </section>

        {/* STATS */}
        <section className="exp-stats">
          <div className="exp-stat">
            <div className="l">Total spent</div>
            <div className="v">{fmtMoney(monthTotal)}<small>this month</small></div>
            <Sparkline values={last7} />
          </div>
          <div className="exp-stat">
            <div className="l">Transactions</div>
            <div className="v">{txCount}<small>entries</small></div>
            <div className="spark" style={{ display: 'flex', gap: 2, alignItems: 'end', height: 28, marginTop: 4 }}>
              {last7.map((v, i) => (
                <div key={i} style={{
                  flex: 1,
                  height: `${Math.max(2, (v / Math.max(1, ...last7)) * 28)}px`,
                  background: 'var(--fg-3)',
                  opacity: 0.6,
                  borderRadius: 1,
                }} />
              ))}
            </div>
          </div>
          <div className="exp-stat avg">
            <CountingOwl />
            <div className="l">Avg / day</div>
            <div className="v">{fmtMoney(avgPerDay)}<small>so far</small></div>
            <div style={{ marginTop: 12, height: 28, display: 'flex', alignItems: 'center', color: 'var(--fg-3)', fontSize: 12 }}>
              {avgPerDay > 200 ? 'Slightly above usual.' : 'Tracking comfortably.'}
            </div>
          </div>
          <div className="exp-stat">
            <div className="l">Top category</div>
            {catData[0] ? (
              <>
                <div className="v" style={{ color: catData[0].color }}>
                  {catData[0].name}<small style={{ color: 'var(--fg-3)' }}>{fmtMoney(catData[0].value)}</small>
                </div>
                <div className="spark" style={{
                  marginTop: 12, height: 8, borderRadius: 4,
                  background: 'var(--bg-3)', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(catData[0].value / monthTotal) * 100}%`,
                    height: '100%',
                    background: catData[0].color,
                    transition: 'width .6s ease',
                  }} />
                </div>
              </>
            ) : <div className="v" style={{ color: 'var(--fg-3)' }}>—</div>}
          </div>
        </section>

        {/* SPLURGE BANNER */}
        {biggestSplurge && (
          <div className="splurge-banner">
            <span className="tag">Top splurge</span>
            <span className="name">{biggestSplurge.title}</span>
            <span className="amt">{fmtMoney(biggestSplurge.amount)}</span>
          </div>
        )}

        {/* CHARTS */}
        <section className="exp-charts">
          <div className="exp-card">
            <div className="exp-card-head">
              <h3>Where it went</h3>
            </div>
            {catData.length === 0
              ? <div className="exp-empty"><div className="big">No spend yet this month.</div></div>
              : <DonutChart
                  data={catData}
                  selected={filterCatName}
                  onSelect={name => setFilterCatName(n => n === name ? null : name)}
                />
            }
          </div>

          <div className="exp-card">
            <div className="exp-card-head">
              <h3>Daily spend</h3>
              <div className="tabs">
                {(['7d', '30d', '90d'] as const).map(t => (
                  <button key={t} className={chartTab === t ? 'active' : ''} onClick={() => setChartTab(t)}>{t}</button>
                ))}
              </div>
            </div>
            <BarChart days={barData} />
            {(() => {
              const peak = barData.reduce((p, d) => d.total > p.total ? d : p, barData[0] ?? { total: 0, date: '' })
              const weekTotal = barData.slice(-7).reduce((t, d) => t + d.total, 0)
              const spendDays = barData.filter(d => d.total > 0).length
              const restDays = barData.length - spendDays
              return (
                <div className="bar-foot">
                  <div className="bar-foot-cell">
                    <span className="l">Peak day</span>
                    <span className="v">{peak.total > 0 ? fmtMoney(peak.total) : '—'}</span>
                    <span className="s">{peak.date ? _FMT_DOW_SHORT.format(isoToUTC(peak.date)) : 'no spending yet'}</span>
                  </div>
                  <div className="bar-foot-cell">
                    <span className="l">Last 7 days</span>
                    <span className="v">{fmtMoney(weekTotal)}</span>
                    <span className="s">{weekTotal > 0 ? `avg ${fmtMoney(weekTotal / 7)}/day` : 'nothing yet'}</span>
                  </div>
                  <div className="bar-foot-cell">
                    <span className="l">Quiet days</span>
                    <span className="v">{restDays}<small style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 4 }}>/ {barData.length}</small></span>
                    <span className="s">{Math.round((restDays / barData.length) * 100)}% no-spend</span>
                  </div>
                </div>
              )
            })()}
          </div>
        </section>

        {/* FILTERS */}
        <section className="exp-filters">
          <div className="left">
            {availableMonths.map(({ month, label }) => (
              <span key={month}
                className={`month-chip${filterMonth === month ? ' active' : ''}`}
                onClick={() => setFilterMonth(month)}>
                {label}
              </span>
            ))}
            <span style={{ width: 1, background: 'var(--line-2,var(--line))', margin: '0 8px', alignSelf: 'stretch' }} />
            <span className={`cat-filter-chip${!filterCat && !filterCatName ? ' active' : ''}`}
              onClick={() => { setFilterCat(null); setFilterCatName(null) }}>
              All
            </span>
            {categories.filter(c => c.type === 'expense' || !c.type).map(c => {
              const { color } = catDisplay(c)
              return (
                <span key={c.id}
                  className={`cat-filter-chip${filterCat === c.id ? ' active' : ''}`}
                  onClick={() => setFilterCat(id => id === c.id ? null : c.id)}>
                  <span className="dot" style={{ background: color }} />{c.name}
                </span>
              )
            })}
          </div>
          <div className="right">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{
                background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg-0)',
                padding: '8px 14px', borderRadius: 'var(--radius-pill,20px)', fontSize: 13,
                outline: 0, width: 180, fontFamily: 'inherit',
              }}
            />
            <select value={sort} onChange={e => setSort(e.target.value)}
              style={{
                background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg-0)',
                padding: '8px 14px', borderRadius: 'var(--radius-pill,20px)', fontSize: 13,
                outline: 0, fontFamily: 'inherit',
              }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="big">Biggest first</option>
              <option value="small">Smallest first</option>
            </select>
          </div>
        </section>

        {/* LIST */}
        <section className="exp-list">
          {groupedFinal.length === 0 ? (
            <div className="exp-empty">
              <div className="big">Nothing matches that.</div>
              <div style={{ color: 'var(--fg-3)', marginTop: 6 }}>
                Try clearing a filter, or{' '}
                <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setAddOpen(true)}>
                  add one
                </span>.
              </div>
            </div>
          ) : groupedFinal.map(g => (
            <div key={g.key} className="day-group">
              <div className="day-head">
                <span className="when" suppressHydrationWarning>{g.label}</span>
                <span className="total">{g.items.length} · <b>{fmtMoney(g.total)}</b></span>
              </div>
              {g.items.map(e => (
                <ExpRow key={e.id} e={e} catById={catById}
                  onEdit={e => setEditTarget(e)}
                  onDel={handleDel}
                />
              ))}
            </div>
          ))}
        </section>
      </main>

      {/* MODALS */}
      {(addOpen || editTarget) && (
        <ExpenseModal
          categories={categories}
          target={editTarget}
          onClose={() => { setAddOpen(false); setEditTarget(null) }}
          onSave={editTarget ? handleEdit : handleAdd}
          onError={handleServerError}
          onIdSwap={handleIdSwap}
        />
      )}

      <Toasts toasts={toasts} />
    </>
  )
}
