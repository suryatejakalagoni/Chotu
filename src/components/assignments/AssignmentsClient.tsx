'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChotuOwl } from '@/components/chotu/ChotuOwl'
import { useChotuActions } from '@/components/chotu/ChotuStage'
import { createAssignment, updateAssignment, deleteAssignment } from '@/lib/actions/assignments'

// ─── types ─────────────────────────────────────────────────────────────────────

export type AssignmentItem = {
  id: string
  subject: string
  title: string
  description: string | null
  due_at: string
  estimated_minutes: number | null
  status: 'not_started' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  progress: number
  archived_at: string | null
}

// ─── constants ──────────────────────────────────────────────────────────────────

const SUBJECTS: Record<string, { color: string; glyph: string; soft: string }> = {
  Physics:  { color: '#3b82f6', glyph: '⚛', soft: 'rgba(59,130,246,0.15)' },
  Maths:    { color: '#ec4899', glyph: '∑', soft: 'rgba(236,72,153,0.15)' },
  CS:       { color: '#10b981', glyph: '⌬', soft: 'rgba(16,185,129,0.15)' },
  Chem:     { color: '#a855f7', glyph: '⚗', soft: 'rgba(168,85,247,0.15)' },
  English:  { color: '#f97316', glyph: '✍', soft: 'rgba(249,115,22,0.15)' },
  EE:       { color: '#fbbf24', glyph: '⚡', soft: 'rgba(251,191,36,0.15)' },
  ML:       { color: '#06b6d4', glyph: '◉', soft: 'rgba(6,182,212,0.15)' },
  History:  { color: '#84cc16', glyph: '◷', soft: 'rgba(132,204,22,0.15)' },
}

const STATUSES = {
  not_started: { label: 'Not started', color: '#9a9ca2' },
  in_progress: { label: 'In progress', color: '#fbbf24' },
  done:        { label: 'Done',        color: '#4ade80' },
}

const PRIORITIES = {
  low:    { label: 'Low',    color: '#6a6c72' },
  medium: { label: 'Medium', color: '#fbbf24' },
  high:   { label: 'High',   color: '#f87171' },
}

const SUBJ_PALETTE = ['#fb7185', '#34d399', '#a78bfa', '#fbbf24', '#22d3ee', '#f472b6', '#94a3b8']

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000))
}
function fmtDueLabel(iso: string): string {
  const d = daysUntil(iso)
  if (d < 0) return `${-d}d late`
  if (d === 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  if (d < 7) return `in ${d}d`
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })
}
function fmtMin(m: number | null): string {
  if (!m) return '—'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60), r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}
function urgencyClass(iso: string, status: string): 'urgent' | 'soon' | 'fine' | 'ok' {
  if (status === 'done') return 'ok'
  const d = daysUntil(iso)
  if (d < 1) return 'urgent'
  if (d < 3) return 'soon'
  return 'fine'
}
function isoFuture(days = 0, hh = 23, mm = 59): string {
  const x = new Date()
  x.setDate(x.getDate() + days)
  x.setHours(hh, mm, 0, 0)
  return x.toISOString()
}
function getSubj(name: string) {
  return SUBJECTS[name] ?? { color: '#888', glyph: '●', soft: 'rgba(120,120,120,0.15)' }
}

// ─── study owl ────────────────────────────────────────────────────────────────

function StudyOwl() {
  const [look, setLook] = useState({ x: 0, y: 0.7 })
  const [mood, setMood] = useState<'normal' | 'sleepy' | 'happy'>('normal')
  const [bubble, setBubble] = useState<string | null>(null)
  useEffect(() => {
    const states = [
      { look: { x: -0.7, y: 0.6 }, mood: 'normal' as const, bubble: null,      ms: 1100 },
      { look: { x: 0.7,  y: 0.6 }, mood: 'normal' as const, bubble: null,      ms: 1100 },
      { look: { x: -0.7, y: 0.75},  mood: 'normal' as const, bubble: 'hmm…',   ms: 1400 },
      { look: { x: 0.7,  y: 0.75},  mood: 'normal' as const, bubble: null,     ms: 1100 },
      { look: { x: 0,    y: 0.85}, mood: 'sleepy' as const, bubble: 'study…',  ms: 1600 },
      { look: { x: 0,    y: -0.1}, mood: 'happy'  as const, bubble: 'almost!', ms: 1400 },
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
    <div className="study-owl">
      {bubble && <div className="counting-bubble">{bubble}</div>}
      <ChotuOwl mood={mood} look={look} size={64} />
      <div className="study-book">
        <span className="page" /><span className="page back" />
        <span className="line l1" /><span className="line l2" /><span className="line l3" />
      </div>
    </div>
  )
}

// ─── progress donut ───────────────────────────────────────────────────────────

function ProgressDonut({ done, total, size = 200 }: { done: number; total: number; size?: number }) {
  const stroke = 22
  const r = (size - stroke - 4) / 2
  const cx = size / 2, cy = size / 2
  const C = 2 * Math.PI * r
  const pct = total ? done / total : 0
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 80); return () => clearTimeout(t) }, [])
  return (
    <svg className="progress-donut" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={stroke} />
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="url(#progGrad)" strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${mounted ? pct * C : 0} ${C}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <defs>
        <linearGradient id="progGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <text x={cx} y={cy - 4} textAnchor="middle"
        style={{ fontFamily: 'Clash Display,sans-serif', fontWeight: 700, fontSize: 38, fill: 'var(--fg-0)' }}>
        {Math.round(pct * 100)}%
      </text>
      <text x={cx} y={cy + 18} textAnchor="middle"
        style={{ fontFamily: 'monospace', fontSize: 9, fill: 'var(--fg-3)', letterSpacing: '0.2em' }}>
        {done} OF {total} DONE
      </text>
    </svg>
  )
}

// ─── week timeline ────────────────────────────────────────────────────────────

function WeekTimeline({ items }: { items: AssignmentItem[] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() + i)
    return { date: d, items: [] as AssignmentItem[] }
  })
  items.forEach(it => {
    const due = new Date(it.due_at); due.setHours(0, 0, 0, 0)
    const diff = Math.round((due.getTime() - today.getTime()) / (24 * 3600 * 1000))
    if (diff >= 0 && diff < 7) days[diff].items.push(it)
  })
  return (
    <div className="week-tl">
      {days.map((d, i) => (
        <div key={i} className={`tl-col${i === 0 ? ' today' : ''}`}>
          <div className="tl-head">
            <span className="dow" suppressHydrationWarning>{d.date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' })}</span>
            <span className="dom" suppressHydrationWarning>{d.date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric' })}</span>
          </div>
          <div className="tl-body">
            {d.items.length === 0 && i === 0 && <div className="tl-empty">Today&apos;s clear</div>}
            {d.items.map(it => {
              const c = getSubj(it.subject)
              return (
                <div key={it.id} className="tl-chip"
                  style={{ background: c.soft, borderLeft: `3px solid ${c.color}` }}>
                  <div className="tl-chip-title" title={it.title}>{it.title}</div>
                  <div className="tl-chip-sub">{it.subject} · {fmtMin(it.estimated_minutes)}</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── assignment row ───────────────────────────────────────────────────────────

function AsnRow({ a, onStatus, onDel, onProgress }: {
  a: AssignmentItem
  onStatus: (id: string, status: 'not_started' | 'in_progress' | 'done') => void
  onDel: (id: string) => void
  onProgress: (id: string, p: number) => void
}) {
  const [open, setOpen] = useState(false)
  const subj = getSubj(a.subject)
  const pri = PRIORITIES[a.priority] ?? PRIORITIES.medium
  const st = STATUSES[a.status] ?? STATUSES.not_started
  const urg = urgencyClass(a.due_at, a.status)

  return (
    <div className={`asn-row urg-${urg}${a.status === 'done' ? ' done' : ''}`}>
      <span className="stripe" style={{ background: subj.color }} />
      <button className="chk-circle"
        onClick={e => { e.stopPropagation(); onStatus(a.id, a.status === 'done' ? 'not_started' : 'done') }}
        title="Toggle done">
        {a.status === 'done' && <span style={{ fontSize: 12 }}>✓</span>}
        {a.status === 'in_progress' && <span className="dot" />}
      </button>
      <div className="info" onClick={() => setOpen(o => !o)}>
        <div className="row1">
          <span className="subj-pill" style={{ color: subj.color, background: subj.soft }}>
            {subj.glyph} {a.subject}
          </span>
          <span className="pri-pill" style={{ color: pri.color }}>
            <span className="pri-dot" style={{ background: pri.color }} />{pri.label}
          </span>
          <span className={`due-pill due-${urg}`}>{fmtDueLabel(a.due_at)}</span>
        </div>
        <div className="title">{a.title}</div>
        <div className="meta">
          <span>Due {new Date(a.due_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <span>·</span>
          <span>~{fmtMin(a.estimated_minutes)}</span>
          <span>·</span>
          <span style={{ color: st.color }}>{st.label}</span>
        </div>
      </div>
      <div className="progress-mini">
        <svg viewBox="0 0 36 36" width="36" height="36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--bg-3)" strokeWidth="4" />
          <circle cx="18" cy="18" r="15" fill="none"
            stroke={a.status === 'done' ? '#4ade80' : subj.color}
            strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${(a.progress / 100) * 94.25} 94.25`}
            transform="rotate(-90 18 18)"
            style={{ transition: 'stroke-dasharray .6s ease' }}
          />
          <text x="18" y="22" textAnchor="middle"
            style={{ fontFamily: 'monospace', fontSize: 9, fill: 'var(--fg-2)', fontWeight: 600 }}>
            {a.progress}%
          </text>
        </svg>
      </div>
      <div className="actions">
        {a.status !== 'done' && (
          <button className="pill-btn primary"
            onClick={() => onStatus(a.id, a.status === 'in_progress' ? 'done' : 'in_progress')}>
            {a.status === 'in_progress' ? 'Mark done ✓' : 'Start →'}
          </button>
        )}
        {a.status === 'in_progress' && (
          <div className="prog-stepper" onClick={e => e.stopPropagation()}>
            <button onClick={() => onProgress(a.id, Math.max(0, a.progress - 25))}>−25%</button>
            <button onClick={() => onProgress(a.id, Math.min(100, a.progress + 25))}>+25%</button>
          </div>
        )}
        <button className="icon-btn small" onClick={() => onDel(a.id)} title="Delete" aria-label="Delete">✕</button>
      </div>
      {open && a.description && (
        <div className="asn-detail">
          <span className="d-label">Notes</span>
          <div>{a.description}</div>
        </div>
      )}
    </div>
  )
}

// ─── add assignment modal ─────────────────────────────────────────────────────

function AddAssignmentModal({ onClose, onSave }: {
  onClose: () => void
  onSave: (a: AssignmentItem) => void
}) {
  const [extraSubjects, setExtraSubjects] = useState<Record<string, { color: string; glyph: string; soft: string }>>({})
  const allSubjects = { ...extraSubjects }
  const [subject, setSubject] = useState('')
  const [addingSubj, setAddingSubj] = useState(false)
  const [newSubjName, setNewSubjName] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [when, setWhen] = useState<'today' | 'tomorrow' | 'week' | 'custom'>('tomorrow')
  const [customDate, setCustomDate] = useState('')
  const [est, setEst] = useState(60)
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const dueIso = useMemo(() => {
    if (when === 'today') return isoFuture(0, 23)
    if (when === 'tomorrow') return isoFuture(1, 23)
    if (when === 'week') return isoFuture(7, 23)
    return customDate ? new Date(customDate + 'T23:59:00').toISOString() : isoFuture(1, 23)
  }, [when, customDate])

  function addCustomSubject() {
    const n = newSubjName.trim()
    if (!n || extraSubjects[n]) return
    const used = new Set(Object.values(extraSubjects).map(s => s.color))
    const color = SUBJ_PALETTE.find(c => !used.has(c)) ?? SUBJ_PALETTE[Math.floor(Math.random() * SUBJ_PALETTE.length)]
    setExtraSubjects(s => ({ ...s, [n]: { color, glyph: '●', soft: color + '26' } }))
    setSubject(n); setAddingSubj(false); setNewSubjName('')
  }

  async function submit() {
    if (!title.trim() || !subject) return
    setSaving(true); setErr(null)
    const raw = {
      subject,
      title: title.trim(),
      description: description.trim() || undefined,
      due_at: dueIso,
      estimated_minutes: est,
      status: 'not_started' as const,
      priority,
      is_recurring: false,
    }
    const result = await createAssignment(raw)
    if (result.error) { setErr(result.error); setSaving(false); return }
    onSave({
      id: 'tmp_' + Date.now(),
      subject, title: raw.title,
      description: description.trim() || null,
      due_at: dueIso,
      estimated_minutes: est,
      status: 'not_started',
      priority,
      progress: 0,
      archived_at: null,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-add-asn" onClick={e => e.stopPropagation()}>
        <div className="asn-head">
          <button className="icon-btn" onClick={onClose}
            style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30 }}
            aria-label="Close">✕</button>
          <div className="amt-label">New assignment</div>
          <h3 className="asn-h">Add to your <span className="hl">to-do</span>.</h3>
        </div>
        <div className="body">
          {err && <div style={{ color: 'var(--danger,#ef4444)', fontSize: 13, marginBottom: 8 }}>{err}</div>}

          <div className="field">
            <label>Subject</label>
            <div className="cat-grid">
              {Object.entries(allSubjects).map(([k, c]) => (
                <div key={k}
                  className={`cat-tile${subject === k ? ' selected' : ''}`}
                  style={{ color: c.color }}
                  onClick={() => setSubject(k)}>
                  <span className="glyph" style={{ background: c.soft }}>{c.glyph}</span>
                  <span className="lbl">{k}</span>
                </div>
              ))}
              <div className={`cat-tile add-custom${addingSubj ? ' selected' : ''}`}
                onClick={() => setAddingSubj(true)} title="Add a subject">
                <span className="glyph" style={{ background: 'var(--bg-4)', color: 'var(--fg-1)' }}>＋</span>
                <span className="lbl">Custom</span>
              </div>
            </div>
            {addingSubj && (
              <div className="custom-subj-row">
                <input type="text" autoFocus value={newSubjName}
                  onChange={e => setNewSubjName(e.target.value)}
                  placeholder="e.g. Sanskrit"
                  onKeyDown={e => {
                    if (e.key === 'Enter') addCustomSubject()
                    if (e.key === 'Escape') { setAddingSubj(false); setNewSubjName('') }
                  }} />
                <button className="pill-btn primary" onClick={addCustomSubject}>Add</button>
                <button className="pill-btn" onClick={() => { setAddingSubj(false); setNewSubjName('') }}>Cancel</button>
              </div>
            )}
          </div>

          <div className="field">
            <label>Title</label>
            <input type="text" autoFocus={!addingSubj} value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Chapter 5 problems" />
          </div>

          <div className="field">
            <label>Notes (optional)</label>
            <textarea rows={2} value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Anything to remember?" />
          </div>

          <div className="field">
            <label>Due</label>
            <div className="date-chips">
              {([
                { k: 'today', l: 'Today' },
                { k: 'tomorrow', l: 'Tomorrow' },
                { k: 'week', l: 'In a week' },
                { k: 'custom', l: 'Custom' },
              ] as const).map(o => (
                <span key={o.k}
                  className={`chip${when === o.k ? ' active' : ''}`}
                  onClick={() => setWhen(o.k)}>{o.l}</span>
              ))}
            </div>
            {when === 'custom' && (
              <input type="date" value={customDate}
                onChange={e => setCustomDate(e.target.value)}
                style={{
                  marginTop: 8, background: 'var(--bg-3)', border: '1px solid var(--line)',
                  color: 'var(--fg-0)', padding: '10px 14px', borderRadius: 'var(--radius-md)',
                  width: '100%', fontSize: 14, fontFamily: 'inherit', outline: 0,
                }} />
            )}
          </div>

          <div className="field">
            <label>Est. time · {fmtMin(est)}</label>
            <input type="range" min="15" max="360" step="15" value={est}
              onChange={e => setEst(Number(e.target.value))}
              className="time-slider" />
            <div className="time-marks">
              <span>15m</span><span>1h</span><span>3h</span><span>6h</span>
            </div>
          </div>

          <div className="field">
            <label>Priority</label>
            <div className="pri-row">
              {Object.entries(PRIORITIES).map(([k, p]) => (
                <div key={k}
                  className={`pri-tile${priority === k ? ' selected' : ''}`}
                  style={{ color: p.color }}
                  onClick={() => setPriority(k as 'low' | 'medium' | 'high')}>
                  <span className="pri-dot" style={{ background: p.color }} />
                  {p.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-save" disabled={!title.trim() || !subject || saving} onClick={submit}>
            {saving ? 'Saving…' : 'Save assignment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── toast ────────────────────────────────────────────────────────────────────

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

export function AssignmentsClient({ initialAssignments }: { initialAssignments: AssignmentItem[] }) {
  const chotu = useChotuActions()
  const [items, setItems] = useState<AssignmentItem[]>(initialAssignments)
  const [addOpen, setAddOpen] = useState(false)
  const [filterSubject, setFilterSubject] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'open' | 'inprogress' | 'done' | 'all'>('open')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'due' | 'priority' | 'subject' | 'time'>('due')
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (msg: string, kind = '') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500)
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const openItems = items.filter(a => a.status !== 'done')
  const doneItems = items.filter(a => a.status === 'done')
  const inProg = items.filter(a => a.status === 'in_progress').length
  const overdue = openItems.filter(a => daysUntil(a.due_at) < 0).length
  const dueWeek = openItems.filter(a => { const d = daysUntil(a.due_at); return d >= 0 && d < 7 }).length
  const totalEstOpen = openItems.reduce((t, a) => t + (a.estimated_minutes ?? 0), 0)

  const subjectLoad = useMemo(() => {
    const m: Record<string, number> = {}
    openItems.forEach(a => { m[a.subject] = (m[a.subject] ?? 0) + (a.estimated_minutes ?? 0) })
    return Object.entries(m).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value)
  }, [openItems])

  const filtered = useMemo(() => {
    let r = items
    if (filterStatus === 'open') r = r.filter(a => a.status !== 'done')
    else if (filterStatus === 'done') r = r.filter(a => a.status === 'done')
    else if (filterStatus === 'inprogress') r = r.filter(a => a.status === 'in_progress')
    if (filterSubject) r = r.filter(a => a.subject === filterSubject)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(a => a.title.toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q))
    }
    r = [...r]
    if (sort === 'due') r.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
    else if (sort === 'priority') {
      const p = { high: 0, medium: 1, low: 2 }
      r.sort((a, b) => (p[a.priority] ?? 1) - (p[b.priority] ?? 1))
    }
    else if (sort === 'subject') r.sort((a, b) => a.subject.localeCompare(b.subject))
    else if (sort === 'time') r.sort((a, b) => (b.estimated_minutes ?? 0) - (a.estimated_minutes ?? 0))
    return r
  }, [items, filterStatus, filterSubject, search, sort])

  const grouped = useMemo(() => {
    const buckets: Record<string, AssignmentItem[]> = {
      overdue: [], today: [], tomorrow: [], thisWeek: [], later: [], done: []
    }
    filtered.forEach(a => {
      if (a.status === 'done') { buckets.done.push(a); return }
      const d = daysUntil(a.due_at)
      if (d < 0) buckets.overdue.push(a)
      else if (d === 0) buckets.today.push(a)
      else if (d === 1) buckets.tomorrow.push(a)
      else if (d < 7) buckets.thisWeek.push(a)
      else buckets.later.push(a)
    })
    return [
      { key: 'overdue',  label: 'Overdue',   items: buckets.overdue },
      { key: 'today',    label: 'Today',     items: buckets.today },
      { key: 'tomorrow', label: 'Tomorrow',  items: buckets.tomorrow },
      { key: 'thisWeek', label: 'This week', items: buckets.thisWeek },
      { key: 'later',    label: 'Later',     items: buckets.later },
      { key: 'done',     label: 'Done',      items: buckets.done },
    ].filter(g => g.items.length > 0)
  }, [filtered])

  // ── known subjects (only subjects with actual assignments) ────────────────

  const usedSubjects = useMemo(() => {
    const result: Record<string, { color: string; glyph: string; soft: string }> = {}
    items.forEach(a => {
      if (!result[a.subject])
        result[a.subject] = SUBJECTS[a.subject] ?? { color: '#888', glyph: '●', soft: 'rgba(120,120,120,0.15)' }
    })
    return result
  }, [items])

  // ── mutations ─────────────────────────────────────────────────────────────

  const handleAdd = (a: AssignmentItem) => {
    setItems(p => [a, ...p])
    toast('Assignment added', 'success')
    chotu?.celebrate('locked in')
  }

  const handleStatus = async (id: string, status: 'not_started' | 'in_progress' | 'done') => {
    setItems(p => p.map(a => {
      if (a.id !== id) return a
      const progress = status === 'done' ? 100 : status === 'in_progress' && a.progress === 0 ? 10 : a.progress
      return { ...a, status, progress }
    }))
    if (status === 'done') { toast('Marked done ✓', 'success'); chotu?.celebrate('nice!') }
    await updateAssignment({ id, status })
  }

  const handleProgress = (id: string, p: number) => {
    setItems(items => items.map(a => a.id === id
      ? { ...a, progress: p, status: p >= 100 ? 'done' : 'in_progress' }
      : a
    ))
    if (p >= 100) chotu?.celebrate('done!')
  }

  const handleDel = async (id: string) => {
    const a = items.find(x => x.id === id)
    setItems(p => p.filter(x => x.id !== id))
    toast(`Removed ${a?.title ?? 'assignment'}`)
    chotu?.react('shy', 'erased')
    const result = await deleteAssignment(id)
    if (result.error) {
      if (a) setItems(p => [a, ...p])
      toast(result.error ?? 'Could not delete', 'error')
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <main className="exp-page">
        {/* HERO */}
        <section className="exp-hero">
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1>Assignments.</h1>
            <p className="sub">
              You have <span className="hl">{openItems.length} open</span>,{' '}
              {dueWeek} due in the next 7 days,{' '}
              {overdue > 0 && <>{overdue} overdue, </>}
              ~{fmtMin(totalEstOpen)} of work to go.
            </p>
          </div>
          <button className="add-fab" onClick={() => setAddOpen(true)}>
            <span className="plus">+</span>
            New assignment
          </button>
        </section>

        {/* STATS */}
        <section className="exp-stats">
          <div className="exp-stat avg">
            <StudyOwl />
            <div className="l">Pending</div>
            <div className="v">{openItems.length}<small>{inProg ? `${inProg} in progress` : 'queued up'}</small></div>
            <div className="spark" style={{
              height: 8, borderRadius: 4, background: 'var(--bg-3)',
              overflow: 'hidden', marginTop: 12
            }}>
              <div style={{
                width: `${items.length ? (doneItems.length / items.length) * 100 : 0}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--success,#4ade80), var(--warn,#fbbf24))',
                transition: 'width .6s ease',
              }} />
            </div>
          </div>

          <div className="exp-stat">
            <div className="l">Due this week</div>
            <div className="v">{dueWeek}<small>{dueWeek === 1 ? 'thing' : 'things'}</small></div>
            <div className="spark" style={{ display: 'flex', gap: 3, alignItems: 'end', height: 28, marginTop: 12 }}>
              {Array.from({ length: 7 }, (_, i) => {
                const c = openItems.filter(a => daysUntil(a.due_at) === i).length
                const max = Math.max(1, ...Array.from({ length: 7 }, (_, j) => openItems.filter(a => daysUntil(a.due_at) === j).length))
                return <div key={i} style={{
                  flex: 1, height: `${(c / max) * 28}px`,
                  background: i === 0 ? 'var(--accent)' : 'var(--fg-3)',
                  opacity: c ? 1 : 0.2, borderRadius: 2, minHeight: 2,
                }} />
              })}
            </div>
          </div>

          <div className="exp-stat">
            <div className="l">Time to ship</div>
            <div className="v">{fmtMin(totalEstOpen)}<small>of work</small></div>
            <div style={{ marginTop: 12, height: 28, display: 'flex', alignItems: 'center', color: 'var(--fg-3)', fontSize: 12 }}>
              {totalEstOpen > 360 ? 'Heavy week. Pace yourself.' : totalEstOpen > 0 ? 'Manageable load.' : 'Caught up!'}
            </div>
          </div>

          <div className="exp-stat">
            <div className="l">Heaviest subject</div>
            {subjectLoad[0] ? (
              <>
                <div className="v" style={{ color: getSubj(subjectLoad[0].name).color }}>
                  {subjectLoad[0].name}<small style={{ color: 'var(--fg-3)' }}>{fmtMin(subjectLoad[0].value)}</small>
                </div>
                <div className="spark" style={{
                  marginTop: 12, height: 8, borderRadius: 4,
                  background: 'var(--bg-3)', overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${(subjectLoad[0].value / Math.max(1, totalEstOpen)) * 100}%`,
                    height: '100%',
                    background: getSubj(subjectLoad[0].name).color,
                    transition: 'width .6s ease',
                  }} />
                </div>
              </>
            ) : <div className="v" style={{ color: 'var(--fg-3)' }}>—</div>}
          </div>
        </section>

        {/* CHARTS */}
        <section className="exp-charts" style={{ gridTemplateColumns: 'auto 1fr' }}>
          <div className="exp-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 260 }}>
            <div className="exp-card-head" style={{ width: '100%' }}>
              <h3>Progress</h3>
            </div>
            <ProgressDonut done={doneItems.length} total={items.length} />
            <div style={{ marginTop: 14, display: 'flex', gap: 18, fontSize: 12, color: 'var(--fg-2)' }}>
              <span><b style={{ color: 'var(--success,#4ade80)' }}>●</b> {doneItems.length} done</span>
              <span><b style={{ color: 'var(--warn,#fbbf24)' }}>●</b> {inProg} in progress</span>
              <span><b style={{ color: 'var(--fg-3)' }}>●</b> {items.length - doneItems.length - inProg} not started</span>
            </div>
          </div>
          <div className="exp-card">
            <div className="exp-card-head">
              <h3>This week&apos;s queue</h3>
              <span style={{ color: 'var(--fg-3)', fontSize: 12, fontFamily: 'monospace' }}>NEXT 7 DAYS</span>
            </div>
            <WeekTimeline items={openItems} />
          </div>
        </section>

        {/* FILTERS */}
        <section className="exp-filters">
          <div className="left">
            {([
              { k: 'open', l: 'Open' },
              { k: 'inprogress', l: 'In progress' },
              { k: 'done', l: 'Done' },
              { k: 'all', l: 'All' },
            ] as const).map(s => (
              <span key={s.k}
                className={`month-chip${filterStatus === s.k ? ' active' : ''}`}
                onClick={() => setFilterStatus(s.k)}>
                {s.l}
              </span>
            ))}
            <span style={{ width: 1, background: 'var(--line-2,var(--line))', margin: '0 8px', alignSelf: 'stretch' }} />
            <span className={`cat-filter-chip${!filterSubject ? ' active' : ''}`}
              onClick={() => setFilterSubject(null)}>All subjects</span>
            {Object.entries(usedSubjects).map(([k, c]) => (
              <span key={k}
                className={`cat-filter-chip${filterSubject === k ? ' active' : ''}`}
                onClick={() => setFilterSubject(x => x === k ? null : k)}>
                <span className="dot" style={{ background: c.color }} />{k}
              </span>
            ))}
          </div>
          <div className="right">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{
                background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg-0)',
                padding: '8px 14px', borderRadius: 'var(--radius-pill,20px)', fontSize: 13,
                outline: 0, width: 180, fontFamily: 'inherit',
              }} />
            <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
              style={{
                background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg-0)',
                padding: '8px 14px', borderRadius: 'var(--radius-pill,20px)', fontSize: 13,
                outline: 0, fontFamily: 'inherit',
              }}>
              <option value="due">By due date</option>
              <option value="priority">By priority</option>
              <option value="subject">By subject</option>
              <option value="time">By est. time</option>
            </select>
          </div>
        </section>

        {/* LIST */}
        <section className="exp-list">
          {grouped.length === 0 ? (
            <div className="exp-empty">
              <div className="big">Nothing here.</div>
              <div style={{ color: 'var(--fg-3)', marginTop: 6 }}>
                <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setAddOpen(true)}>
                  Add an assignment
                </span>{' '}to get going.
              </div>
            </div>
          ) : grouped.map(g => (
            <div key={g.key} className="day-group">
              <div className="day-head">
                <span className="when">{g.label}</span>
                <span className="total">
                  {g.items.length} · {fmtMin(g.items.reduce((t, a) => t + (a.estimated_minutes ?? 0), 0))}{' '}
                  <small style={{ color: 'var(--fg-3)' }}>est</small>
                </span>
              </div>
              {g.items.map(a => (
                <AsnRow key={a.id} a={a}
                  onStatus={handleStatus}
                  onDel={handleDel}
                  onProgress={handleProgress}
                />
              ))}
            </div>
          ))}
        </section>
      </main>

      {addOpen && <AddAssignmentModal onClose={() => setAddOpen(false)} onSave={handleAdd} />}
      <Toasts toasts={toasts} />
    </>
  )
}
