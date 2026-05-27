'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChotuOwl } from '@/components/chotu/ChotuOwl'
import { useChotuActions } from '@/components/chotu/ChotuStage'
import { createExam, deleteExam, updateExamStatus } from '@/lib/actions/exams'

// ─── types ─────────────────────────────────────────────────────────────────────

export type ExamItem = {
  id: string
  subject: string
  title: string
  exam_type: string | null
  exam_at: string
  venue: string | null
  syllabus_text: string | null
  notes: string | null
  // TODO: consolidate — 'completed'/'cancelled' are Day 7 legacy; 'ongoing'/'done'/'missed' are Phase 6 UI values
  status: 'upcoming' | 'ongoing' | 'done' | 'missed' | 'completed' | 'cancelled'
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

const EX_TYPES = ['Mid-sem', 'End-sem', 'Unit Test', 'Quiz', 'Viva', 'Lab', 'Other']
const SUBJ_PALETTE = ['#fb7185', '#34d399', '#a78bfa', '#fbbf24', '#22d3ee', '#f472b6', '#94a3b8']

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000))
}
function fmtCountdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms < 0) return 'passed'
  const d = Math.floor(ms / (24 * 3600 * 1000))
  const h = Math.floor((ms % (24 * 3600 * 1000)) / (3600 * 1000))
  if (d === 0) return `${h}h`
  return d === 1 ? '1 day' : `${d} days`
}
function isoFuture(days = 7, hh = 10): string {
  const x = new Date()
  x.setDate(x.getDate() + days)
  x.setHours(hh, 0, 0, 0)
  return x.toISOString()
}
function getSubj(name: string) {
  return SUBJECTS[name] ?? { color: '#888', glyph: '●', soft: 'rgba(120,120,120,0.15)' }
}

// ─── exam owl ─────────────────────────────────────────────────────────────────

function ExamOwl() {
  const [look, setLook] = useState({ x: 0, y: 0.7 })
  const [mood, setMood] = useState<'normal' | 'sleepy' | 'surprised'>('normal')
  const [bubble, setBubble] = useState<string | null>(null)
  useEffect(() => {
    const states = [
      { look: { x: -0.6, y: 0.7 }, mood: 'normal' as const,    bubble: 'cram…',  ms: 1400 },
      { look: { x: 0.6,  y: 0.7 }, mood: 'normal' as const,    bubble: null,     ms: 1400 },
      { look: { x: 0,    y: 0.8 }, mood: 'sleepy' as const,    bubble: 'so much',ms: 1600 },
      { look: { x: 0,  y: -0.1 }, mood: 'surprised' as const, bubble: 'eep!',   ms: 1400 },
      { look: { x: 0,    y: 0.7 }, mood: 'normal' as const,    bubble: null,     ms: 1400 },
    ]
    let i = 0, alive = true
    function tick() {
      if (!alive) return
      const s = states[i % states.length]
      setLook(s.look); setMood(s.mood); setBubble(s.bubble)
      i++; setTimeout(tick, s.ms)
    }
    tick(); return () => { alive = false }
  }, [])
  return (
    <div className="exam-owl">
      <div className="grad-cap"><span className="tassel" /></div>
      {bubble && <div className="counting-bubble">{bubble}</div>}
      <ChotuOwl mood={mood} look={look} size={64} />
    </div>
  )
}

// ─── exam timeline ────────────────────────────────────────────────────────────

function ExamTimeline({ items }: { items: ExamItem[] }) {
  const upcoming = items.filter(e => e.status === 'upcoming' || e.status === 'ongoing')
    .sort((a, b) => new Date(a.exam_at).getTime() - new Date(b.exam_at).getTime())
  if (upcoming.length === 0) {
    return <div className="exp-empty" style={{ padding: 30 }}><div className="big">All clear — no exams ahead.</div></div>
  }
  const maxDays = Math.max(14, ...upcoming.map(e => daysUntil(e.exam_at)))
  return (
    <div className="exam-tl">
      <div className="exam-tl-axis">
        {[0, Math.floor(maxDays * 0.25), Math.floor(maxDays * 0.5), Math.floor(maxDays * 0.75), maxDays].map(d => (
          <span key={d} className="tick" style={{ left: `${(d / maxDays) * 100}%` }}>
            <span className="lbl">{d === 0 ? 'today' : `+${d}d`}</span>
          </span>
        ))}
      </div>
      <div className="exam-tl-track">
        {upcoming.map((e, i) => {
          const d = Math.max(0, daysUntil(e.exam_at))
          const left = (d / maxDays) * 100
          const subj = getSubj(e.subject)
          return (
            <div key={e.id}
              className={`exam-pin${d < 2 ? ' urgent' : d < 7 ? ' soon' : ''}`}
              style={{ left: `${left}%`, top: `${(i % 3) * 36}px` }}>
              <span className="dot" style={{ background: subj.color }} />
              <div className="exam-pin-card" style={{ borderLeftColor: subj.color, background: subj.soft }}>
                <div className="t">{e.title}</div>
                <div className="m">{e.subject} · {fmtCountdown(e.exam_at)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── exam row ─────────────────────────────────────────────────────────────────

function ExamRow({ e, onDone, onDel }: {
  e: ExamItem; onDone: (id: string) => void; onDel: (id: string) => void
}) {
  const subj = getSubj(e.subject)
  const d = daysUntil(e.exam_at)
  const isTerminal = e.status === 'done' || e.status === 'completed' || e.status === 'missed' || e.status === 'cancelled'
  const urg = isTerminal ? 'ok' : d < 1 ? 'urgent' : d < 4 ? 'soon' : 'fine'
  return (
    <div className={`asn-row urg-${urg}${isTerminal ? ' done' : ''}`}>
      <span className="stripe" style={{ background: subj.color }} />
      <button className="chk-circle"
        onClick={() => onDone(e.id)}
        title="Mark done" aria-label="Mark done">
        {isTerminal && <span style={{ fontSize: 12 }}>✓</span>}
      </button>
      <div className="info">
        <div className="row1">
          <span className="subj-pill" style={{ color: subj.color, background: subj.soft }}>
            {subj.glyph} {e.subject}
          </span>
          {e.exam_type && (
            <span className="pri-pill" style={{ color: 'var(--fg-2)' }}>{e.exam_type}</span>
          )}
          <span className={`due-pill due-${urg}`}>
            {e.status === 'done' || e.status === 'completed' ? 'done'
              : e.status === 'missed' ? 'missed'
              : e.status === 'ongoing' ? 'ongoing'
              : fmtCountdown(e.exam_at)}
          </span>
        </div>
        <div className="title">{e.title}</div>
        <div className="meta">
          <span>{new Date(e.exam_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, {new Date(e.exam_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}</span>
          {e.venue && <><span>·</span><span>{e.venue}</span></>}
        </div>
        {e.syllabus_text && (
          <div className="meta" style={{ marginTop: 6, fontStyle: 'italic' }}>
            Syllabus: {e.syllabus_text}
          </div>
        )}
      </div>
      <div className="progress-mini" />
      <div className="actions">
        <button className="icon-btn small" onClick={() => onDel(e.id)} title="Delete" aria-label="Delete">✕</button>
      </div>
    </div>
  )
}

// ─── add exam modal ───────────────────────────────────────────────────────────

function AddExamModal({ onClose, onSave }: {
  onClose: () => void
  onSave: (e: ExamItem) => void
}) {
  const [extraSubjects, setExtraSubjects] = useState<Record<string, { color: string; glyph: string; soft: string }>>({})
  const allSubjects = { ...extraSubjects }
  const [subject, setSubject] = useState('')
  const [examType, setExamType] = useState('Mid-sem')
  const [title, setTitle] = useState('')
  const [dateVal, setDateVal] = useState(isoFuture(7, 10).slice(0, 16))
  const [venue, setVenue] = useState('')
  const [syllabus, setSyllabus] = useState('')
  const [addingSubj, setAddingSubj] = useState(false)
  const [newSubj, setNewSubj] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  function addCustomSubject() {
    const n = newSubj.trim()
    if (!n || extraSubjects[n]) return
    const used = new Set(Object.values(extraSubjects).map(s => s.color))
    const color = SUBJ_PALETTE.find(c => !used.has(c)) ?? SUBJ_PALETTE[Math.floor(Math.random() * SUBJ_PALETTE.length)]
    setExtraSubjects(s => ({ ...s, [n]: { color, glyph: '●', soft: color + '26' } }))
    setSubject(n); setAddingSubj(false); setNewSubj('')
  }

  async function submit() {
    if (!title.trim() || !subject) return
    setSaving(true); setErr(null)
    const raw = {
      subject,
      exam_type: examType,
      exam_at: new Date(dateVal).toISOString(),
      venue: venue.trim() || undefined,
      syllabus_text: syllabus.trim() || undefined,
      status: 'upcoming' as const,
    }
    const result = await createExam(raw)
    if (result.error) { setErr(result.error); setSaving(false); return }
    onSave({
      id: result.id ?? 'tmp_' + Date.now(),
      subject, title: title.trim(),
      exam_type: examType,
      exam_at: raw.exam_at,
      venue: venue.trim() || null,
      syllabus_text: syllabus.trim() || null,
      notes: null,
      status: 'upcoming',
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
          <div className="amt-label">Add exam</div>
          <h3 className="asn-h">Pin a <span className="hl">date</span> on your radar.</h3>
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
                onClick={() => setAddingSubj(true)}>
                <span className="glyph" style={{ background: 'var(--bg-4)', color: 'var(--fg-1)' }}>＋</span>
                <span className="lbl">Custom</span>
              </div>
            </div>
            {addingSubj && (
              <div className="custom-subj-row">
                <input autoFocus value={newSubj}
                  onChange={e => setNewSubj(e.target.value)}
                  placeholder="e.g. Sanskrit"
                  onKeyDown={e => {
                    if (e.key === 'Enter') addCustomSubject()
                    if (e.key === 'Escape') { setAddingSubj(false); setNewSubj('') }
                  }} />
                <button className="pill-btn primary" onClick={addCustomSubject}>Add</button>
                <button className="pill-btn" onClick={() => { setAddingSubj(false); setNewSubj('') }}>Cancel</button>
              </div>
            )}
          </div>

          <div className="field">
            <label>Type</label>
            <div className="date-chips" style={{ flexWrap: 'wrap' }}>
              {EX_TYPES.map(t => (
                <span key={t}
                  className={`chip${examType === t ? ' active' : ''}`}
                  onClick={() => setExamType(t)}>{t}</span>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Linear Algebra — Mid" />
          </div>

          <div className="field">
            <label>Date &amp; time</label>
            <input type="datetime-local" value={dateVal.slice(0, 16)}
              onChange={e => setDateVal(e.target.value)}
              className="rem-custom-input"
              style={{ width: '100%' }} />
          </div>

          <div className="field">
            <label>Venue</label>
            <input type="text" value={venue} onChange={e => setVenue(e.target.value)}
              placeholder="e.g. Block-B 204" />
          </div>

          <div className="field">
            <label>Syllabus / topics</label>
            <textarea rows={3} value={syllabus} onChange={e => setSyllabus(e.target.value)}
              placeholder="Chapters, topics, page numbers…" />
          </div>
        </div>

        <div className="footer">
          <button className="btn-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-save" disabled={!title.trim() || !subject || saving} onClick={submit}>
            {saving ? 'Saving…' : 'Add exam'}
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

export function ExamsClient({ initialExams }: { initialExams: ExamItem[] }) {
  const chotu = useChotuActions()
  const [items, setItems] = useState<ExamItem[]>(initialExams)
  const [addOpen, setAddOpen] = useState(false)
  const [filterSubject, setFilterSubject] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'date' | 'subject'>('date')
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (msg: string, kind = '') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500)
  }

  // ── derived ───────────────────────────────────────────────────────────────

  const upcoming = items.filter(e => e.status === 'upcoming' || e.status === 'ongoing')
  const next = [...upcoming].sort((a, b) => new Date(a.exam_at).getTime() - new Date(b.exam_at).getTime())[0]
  const inWeek = upcoming.filter(e => { const d = daysUntil(e.exam_at); return d >= 0 && d < 7 }).length

  const subjLoad = useMemo(() => {
    const m: Record<string, number> = {}
    upcoming.forEach(e => { m[e.subject] = (m[e.subject] ?? 0) + 1 })
    return Object.entries(m).map(([n, v]) => ({ name: n, count: v })).sort((a, b) => b.count - a.count)
  }, [upcoming])

  const filtered = useMemo(() => {
    let r = items
    if (filterSubject) r = r.filter(e => e.subject === filterSubject)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(e => e.title.toLowerCase().includes(q) || e.subject.toLowerCase().includes(q))
    }
    r = [...r]
    if (sort === 'date') r.sort((a, b) => new Date(a.exam_at).getTime() - new Date(b.exam_at).getTime())
    else r.sort((a, b) => a.subject.localeCompare(b.subject))
    return r
  }, [items, filterSubject, search, sort])

  const grouped = useMemo(() => {
    const thisWeek: ExamItem[] = [], thisMonth: ExamItem[] = [], later: ExamItem[] = [], done: ExamItem[] = []
    filtered.forEach(e => {
      if (e.status === 'done' || e.status === 'missed' || e.status === 'completed' || e.status === 'cancelled') { done.push(e); return }
      const d = daysUntil(e.exam_at)
      if (d < 0) done.push(e)
      else if (d < 7) thisWeek.push(e)
      else if (d < 30) thisMonth.push(e)
      else later.push(e)
    })
    return [
      { key: 'thisWeek',  label: 'This week',  items: thisWeek },
      { key: 'thisMonth', label: 'This month', items: thisMonth },
      { key: 'later',     label: 'Later',      items: later },
      { key: 'done',      label: 'Done',       items: done },
    ].filter(g => g.items.length > 0)
  }, [filtered])

  // ── known subjects ────────────────────────────────────────────────────────

  const usedSubjects = useMemo(() => {
    const result: Record<string, { color: string; glyph: string; soft: string }> = {}
    items.forEach(e => {
      if (!result[e.subject])
        result[e.subject] = SUBJECTS[e.subject] ?? { color: '#888', glyph: '●', soft: 'rgba(120,120,120,0.15)' }
    })
    return result
  }, [items])

  // ── mutations ─────────────────────────────────────────────────────────────

  const handleAdd = (e: ExamItem) => {
    setItems(p => [e, ...p])
    toast('Exam added', 'success')
    chotu?.celebrate('locked in')
  }

  const handleDone = async (id: string) => {
    const exam = items.find(e => e.id === id)
    // Toggle: any terminal state → upcoming; active → done (new canonical value)
    const isTerminal = exam?.status === 'done' || exam?.status === 'completed' || exam?.status === 'missed'
    const newStatus = isTerminal ? 'upcoming' : 'done'
    setItems(p => p.map(e => e.id === id ? { ...e, status: newStatus } : e))
    if (newStatus === 'done') { toast('Marked done ✓', 'success'); chotu?.celebrate('nice!') }
    const result = await updateExamStatus({ id, status: newStatus })
    if (result?.error) toast(result.error, 'error')
  }

  const handleDel = async (id: string) => {
    const exam = items.find(e => e.id === id)
    setItems(p => p.filter(e => e.id !== id))
    toast(`Removed ${exam?.title ?? 'exam'}`)
    chotu?.react('shy', 'erased')
    const result = await deleteExam(id)
    if (result?.error) {
      if (exam) setItems(p => [exam, ...p])
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
            <h1>Exams.</h1>
            <p className="sub">
              {upcoming.length > 0 ? (
                <>You have <span className="hl">{upcoming.length} upcoming</span>,{' '}
                  {inWeek > 0 && <>{inWeek} this week. </>}
                  {next && <>Next: {next.title} in {fmtCountdown(next.exam_at)}.</>}
                </>
              ) : 'No upcoming exams. All clear!'}
            </p>
          </div>
          <button className="add-fab" onClick={() => setAddOpen(true)}>
            <span className="plus">+</span>
            Add exam
          </button>
        </section>

        {/* STATS */}
        <section className="exp-stats">
          <div className="exp-stat avg">
            <ExamOwl />
            <div className="l">Upcoming</div>
            <div className="v">{upcoming.length}<small>{inWeek} this week</small></div>
            <div className="spark" style={{ height: 8, borderRadius: 4, background: 'var(--bg-3)', overflow: 'hidden', marginTop: 12 }}>
              <div style={{
                width: `${items.length ? ((items.length - upcoming.length) / items.length) * 100 : 0}%`,
                height: '100%', background: 'linear-gradient(90deg, var(--success,#4ade80), var(--accent))',
                transition: 'width .6s ease',
              }} />
            </div>
          </div>
          <div className="exp-stat">
            <div className="l">This week</div>
            <div className="v">{inWeek}<small>exam{inWeek !== 1 ? 's' : ''}</small></div>
            <div className="spark" style={{ display: 'flex', gap: 3, alignItems: 'end', height: 28, marginTop: 12 }}>
              {Array.from({ length: 7 }, (_, i) => {
                const c = upcoming.filter(e => daysUntil(e.exam_at) === i).length
                const max = Math.max(1, ...Array.from({ length: 7 }, (_, j) => upcoming.filter(e => daysUntil(e.exam_at) === j).length))
                return <div key={i} style={{
                  flex: 1, height: `${(c / max) * 28}px`,
                  background: i === 0 ? 'var(--danger,#f87171)' : i < 3 ? 'var(--warn,#fbbf24)' : 'var(--fg-3)',
                  opacity: c ? 1 : 0.2, borderRadius: 2, minHeight: 2,
                }} />
              })}
            </div>
          </div>
          <div className="exp-stat">
            <div className="l">Next exam</div>
            {next ? (
              <>
                <div className="v" style={{ color: getSubj(next.subject).color }}>
                  {next.subject}<small style={{ color: 'var(--fg-3)' }}>{fmtCountdown(next.exam_at)}</small>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--fg-3)' }}>
                  {new Date(next.exam_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {next.venue ? ` · ${next.venue}` : ''}
                </div>
              </>
            ) : <div className="v" style={{ color: 'var(--fg-3)' }}>None</div>}
          </div>
          <div className="exp-stat">
            <div className="l">Hardest subject</div>
            {subjLoad[0] ? (
              <>
                <div className="v" style={{ color: getSubj(subjLoad[0].name).color }}>
                  {subjLoad[0].name}<small style={{ color: 'var(--fg-3)' }}>{subjLoad[0].count} exam{subjLoad[0].count !== 1 ? 's' : ''}</small>
                </div>
                <div className="spark" style={{ marginTop: 12, height: 8, borderRadius: 4, background: 'var(--bg-3)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(subjLoad[0].count / Math.max(1, upcoming.length)) * 100}%`,
                    height: '100%', background: getSubj(subjLoad[0].name).color,
                    transition: 'width .6s ease',
                  }} />
                </div>
              </>
            ) : <div className="v" style={{ color: 'var(--fg-3)' }}>—</div>}
          </div>
        </section>

        {/* TIMELINE */}
        <section className="exp-charts" style={{ gridTemplateColumns: '1fr' }}>
          <div className="exp-card">
            <div className="exp-card-head">
              <h3>Exam timeline</h3>
            </div>
            <ExamTimeline items={items} />
          </div>
        </section>

        {/* FILTERS */}
        <section className="exp-filters">
          <div className="left">
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
              <option value="date">By date</option>
              <option value="subject">By subject</option>
            </select>
          </div>
        </section>

        {/* LIST */}
        <section className="exp-list">
          {grouped.length === 0 ? (
            <div className="exp-empty">
              <div className="big">No exams yet.</div>
              <div style={{ color: 'var(--fg-3)', marginTop: 6 }}>
                <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => setAddOpen(true)}>
                  Add your first exam
                </span>{' '}to start tracking.
              </div>
            </div>
          ) : grouped.map(g => (
            <div key={g.key} className="day-group">
              <div className="day-head">
                <span className="when">{g.label}</span>
                <span className="total">{g.items.length} exam{g.items.length !== 1 ? 's' : ''}</span>
              </div>
              {g.items.map(e => (
                <ExamRow key={e.id} e={e} onDone={handleDone} onDel={handleDel} />
              ))}
            </div>
          ))}
        </section>
      </main>

      {addOpen && <AddExamModal onClose={() => setAddOpen(false)} onSave={handleAdd} />}
      <Toasts toasts={toasts} />
    </>
  )
}
