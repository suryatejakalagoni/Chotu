'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useChotuActions } from '@/components/chotu/ChotuStage'

// ─── types ─────────────────────────────────────────────────────────────────────

export type DashAssignment = {
  id: string
  subject: string
  title: string
  due_at: string
  status: 'not_started' | 'in_progress' | 'done'
}

export type DashExam = {
  id: string
  subject: string
  title: string
  exam_type: string | null
  exam_at: string
  venue: string | null
  status: 'upcoming' | 'completed' | 'cancelled'
}

export type DashExpense = {
  id: string
  title: string
  amount: number
  category_name: string | null
  category_icon: string | null
  spent_at: string
}

export type DashPost = {
  id: string
  title: string
  content_type: string
  subject_tag: string | null
  created_at: string
}

export type DashboardProps = {
  userName: string
  assignments: DashAssignment[]
  exams: DashExam[]
  expenses: DashExpense[]
  posts: DashPost[]
  monthTotal: number
}

// ─── constants ──────────────────────────────────────────────────────────────────

const SUBJ_COLORS: Record<string, string> = {
  Physics: '#3b82f6', Maths: '#ec4899', CS: '#10b981', Chem: '#a855f7',
  English: '#f97316', EE: '#fbbf24', ML: '#06b6d4', History: '#84cc16',
}
function subjColor(s: string) { return SUBJ_COLORS[s] ?? '#888' }

const CAT_ICON: Record<string, string> = {
  Food: '🍜', Transport: '🚌', Books: '📚', Coffee: '☕', Stationery: '✏️',
  Entertainment: '🎬', Health: '💊', Clothing: '👕', Housing: '🏠', Misc: '•',
}

const POST_TYPE_LABEL: Record<string, string> = {
  note: 'Note', question: 'Q&A', resource: 'Resource',
  announcement: 'Notice', event: 'Event',
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000))
}
function relTime(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
function dueLabel(iso: string) {
  const d = Math.round((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000))
  if (d < 0) return `${-d}d late`
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  return `${d}d`
}
function dueCls(iso: string) {
  const d = Math.round((new Date(iso).getTime() - Date.now()) / (24 * 3600 * 1000))
  if (d < 1) return 'urgent'
  if (d < 3) return 'soon'
  return 'ok'
}

// ─── VoiceCard ────────────────────────────────────────────────────────────────

function VoiceCard() {
  return (
    <div className="voice-card">
      <div className="vc-mic">🎙</div>
      <div>
        <p className="voice-title">Tap to speak</p>
        <p className="voice-sub">Works best on Android Chrome. Say "add assignment" or "add expense".</p>
      </div>
      <div className="vc-model">
        <div className="l">NLU model</div>
        <div className="v">Chotu v3</div>
      </div>
    </div>
  )
}

// ─── DueSoonCard ──────────────────────────────────────────────────────────────

function DueSoonCard({ assignments }: { assignments: DashAssignment[] }) {
  const soon = useMemo(() => {
    const now = Date.now()
    return assignments
      .filter(a => a.status !== 'done')
      .map(a => ({ ...a, ms: new Date(a.due_at).getTime() - now }))
      .filter(a => a.ms < 4 * 24 * 3600 * 1000)
      .sort((a, b) => a.ms - b.ms)
      .slice(0, 4)
  }, [assignments])

  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <h2>Due Soon</h2>
        <div className="dash-card-actions">
          <Link href="/assignments" className="dash-linklike">View all →</Link>
        </div>
      </div>
      {soon.length === 0 ? (
        <div className="dash-empty">No assignments due in the next 3 days. <span className="accent">All clear ✓</span></div>
      ) : (
        <div className="dash-list">
          {soon.map(a => (
            <div key={a.id} className="dash-item">
              <div className="dash-chk" />
              <div className="body">
                <div className="ititle">{a.title}</div>
                <div className="imeta" style={{ color: subjColor(a.subject) }}>{a.subject}</div>
              </div>
              <div className="iright">
                <span className={`dash-badge ${dueCls(a.due_at)}`}>{dueLabel(a.due_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ExamsCard ────────────────────────────────────────────────────────────────

function ExamsCard({ exams }: { exams: DashExam[] }) {
  const upcoming = useMemo(() => (
    exams
      .filter(e => e.status === 'upcoming' && new Date(e.exam_at).getTime() > Date.now())
      .sort((a, b) => new Date(a.exam_at).getTime() - new Date(b.exam_at).getTime())
      .slice(0, 4)
  ), [exams])

  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <h2>Upcoming Exams</h2>
        <div className="dash-card-actions">
          <Link href="/exams" className="dash-linklike">View all →</Link>
        </div>
      </div>
      {upcoming.length === 0 ? (
        <div className="dash-empty">No upcoming exams.</div>
      ) : (
        <div className="dash-list">
          {upcoming.map(e => {
            const d = Math.round((new Date(e.exam_at).getTime() - Date.now()) / (24 * 3600 * 1000))
            const cls = d < 2 ? 'urgent' : d < 7 ? 'soon' : 'ok'
            const date = new Date(e.exam_at)
            return (
              <div key={e.id} className="dash-item">
                <div className="lead" style={{ background: subjColor(e.subject) + '26', color: subjColor(e.subject) }}>
                  ⏰
                </div>
                <div className="body">
                  <div className="ititle">{e.title}</div>
                  <div className="imeta">
                    {date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' })}
                    {e.venue ? ` · ${e.venue}` : ''}
                  </div>
                </div>
                <div className="iright">
                  <span className={`dash-badge ${cls}`}>in {d}d</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── ExpensesCard ─────────────────────────────────────────────────────────────

function ExpensesCard({ expenses }: { expenses: DashExpense[] }) {
  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <h2>Recent Expenses</h2>
        <div className="dash-card-actions">
          <Link href="/expenses" className="dash-linklike">View all →</Link>
        </div>
      </div>
      {expenses.length === 0 ? (
        <div className="dash-empty">No expenses yet. <Link href="/expenses" className="dash-linklike" style={{ padding: '0 2px' }}>Add one</Link></div>
      ) : (
        <div className="dash-list">
          {expenses.map(e => {
            const icon = e.category_icon ?? CAT_ICON[e.category_name ?? ''] ?? '•'
            return (
              <div key={e.id} className="dash-item">
                <div className="lead" style={{ background: 'rgba(255,210,77,0.12)', color: 'var(--accent)' }}>
                  {icon}
                </div>
                <div className="body">
                  <div className="ititle">{e.title}</div>
                  <div className="imeta">
                    {e.category_name ?? 'Misc'} · {new Date(e.spent_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}
                  </div>
                </div>
                <div className="iright" style={{ color: 'var(--danger)' }}>− ₹{e.amount}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── CommunityCard ────────────────────────────────────────────────────────────

function CommunityCard({ posts }: { posts: DashPost[] }) {
  return (
    <div className="dash-card">
      <div className="dash-card-head">
        <h2>Community Hub</h2>
        <div className="dash-card-actions">
          <Link href="/community" className="dash-linklike">View all →</Link>
        </div>
      </div>
      {posts.length === 0 ? (
        <div className="dash-empty">No posts this week. <Link href="/community" className="dash-linklike" style={{ padding: '0 2px' }}>Share something</Link></div>
      ) : (
        <div className="dash-feed">
          {posts.map(p => (
            <Link key={p.id} href={`/community/${p.id}`} className="dash-feed-item" style={{ textDecoration: 'none' }}>
              <div>
                <span className="subj-pill" style={{ fontSize: 11, padding: '1px 7px' }}>
                  {POST_TYPE_LABEL[p.content_type] ?? p.content_type}
                </span>
                {p.subject_tag && <span className="fwhen"> {p.subject_tag}</span>}
                <span className="fwhen">{relTime(p.created_at)}</span>
              </div>
              <div className="ftext">{p.title}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MonthCard ────────────────────────────────────────────────────────────────

function MonthCard({ monthTotal }: { monthTotal: number }) {
  const budget = 3000
  const income = 0
  const balance = income - monthTotal
  const pct = budget ? Math.min(100, (monthTotal / budget) * 100) : 0
  const over = monthTotal > budget

  return (
    <div className="month-card">
      <div className="dash-card-head">
        <h2>This Month</h2>
        <Link href="/expenses" className="dash-linklike">View all →</Link>
      </div>
      <div className="month-stats">
        <div className="month-stat income">
          <div className="l">Income</div>
          <div className="v">₹{income}</div>
        </div>
        <div className="month-stat spent">
          <div className="l">Spent</div>
          <div className="v">₹{Math.round(monthTotal)}</div>
        </div>
        <div className="month-stat balance">
          <div className="l">Balance</div>
          <div className="v">₹{Math.round(balance)}</div>
        </div>
      </div>
      {budget > 0 && (
        <div className="budget-bar-wrap">
          <div className={`budget-bar-fill${over ? ' over' : ''}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      <div className="budget-bar-meta">
        {budget > 0 ? `Budget ₹${budget} · ${Math.round(pct)}% used` : 'Set a monthly budget to track your limit.'}
      </div>
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

export function DashboardClient({
  userName, assignments, exams, expenses, posts, monthTotal,
}: DashboardProps) {
  useChotuActions()
  const now = new Date()
  const openCount = assignments.filter(a => a.status !== 'done').length
  const examCount = exams.filter(e => e.status === 'upcoming' && new Date(e.exam_at).getTime() > Date.now()).length

  return (
    <main className="dash-page">
      {/* GREETING */}
      <section className="dash-greeting">
        <div>
          <h1>Hey, <span className="hl">{userName}</span>!</h1>
          <div className="date" suppressHydrationWarning>
            {now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <div className="day-stats">
          <div className="day-stat">
            <span className="v">{openCount}</span>
            <span className="l">Open tasks</span>
          </div>
          <div className="day-stat">
            <span className="v">{examCount}</span>
            <span className="l">Exams ahead</span>
          </div>
        </div>
      </section>

      {/* VOICE */}
      <VoiceCard />

      {/* ROW 1: Due Soon + Community */}
      <div className="dash-grid">
        <DueSoonCard assignments={assignments} />
        <CommunityCard posts={posts} />
      </div>

      {/* ROW 2: Exams + Recent Expenses */}
      <div className="dash-grid">
        <ExamsCard exams={exams} />
        <ExpensesCard expenses={expenses} />
      </div>

      {/* MONTH */}
      <MonthCard monthTotal={monthTotal} />
    </main>
  )
}
