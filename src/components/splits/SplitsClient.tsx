'use client'

import { useState, useMemo, useEffect } from 'react'
import { ChotuOwl } from '@/components/chotu/ChotuOwl'
import { useChotuActions } from '@/components/chotu/ChotuStage'
import { deleteSplit, settleShare } from '@/lib/actions/splits'
import type { SplitWithShares, FriendWithBalance } from '@/types/splits'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtRupee(n: number) { return '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN') }

function dayLabel(iso: string) {
  const d = new Date(iso), now = new Date()
  const diff = Math.floor((now.getTime() - d.getTime()) / (24 * 3600 * 1000))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return d.toLocaleDateString('en-IN', { weekday: 'long' })
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function colorFor(name: string) {
  const palette = ['#ffd24d', '#c08555', '#ffe27a', '#e8c790', '#fbbf24', '#3b82f6', '#ec4899', '#10b981', '#a855f7', '#06b6d4']
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return palette[h % palette.length]
}

// ─── SplitsOwl ────────────────────────────────────────────────────────────────

function SplitsOwl() {
  const [look, setLook] = useState({ x: 0, y: 0.6 })
  const [mood, setMood] = useState<'normal' | 'happy' | 'surprised'>('normal')
  const [bubble, setBubble] = useState<string | null>(null)
  useEffect(() => {
    const states = [
      { look: { x: -0.5, y: 0.7 }, mood: 'normal' as const, bubble: '÷ 4',   ms: 1400 },
      { look: { x: 0.5,  y: 0.7 }, mood: 'normal' as const, bubble: '+ ₹50', ms: 1400 },
      { look: { x: 0,    y: 0.85}, mood: 'normal' as const, bubble: '…',     ms: 1200 },
      { look: { x: 0,    y:-0.1 }, mood: 'happy'  as const, bubble: 'fair!', ms: 1400 },
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
      {bubble && <div className="counting-bubble">{bubble}</div>}
      <ChotuOwl mood={mood} look={look} size={64} />
    </div>
  )
}

// ─── Friend balance bars ──────────────────────────────────────────────────────

function FriendBalances({ friends }: { friends: FriendWithBalance[] }) {
  const entries = friends
    .filter(f => !f.deleted_at && Math.abs(f.total_owed) > 0)
    .sort((a, b) => Math.abs(b.total_owed) - Math.abs(a.total_owed))
  const max = Math.max(1, ...entries.map(e => Math.abs(e.total_owed)))

  if (entries.length === 0) {
    return <div className="exp-empty" style={{ padding: 20 }}><div className="big">All settled with everyone. ✓</div></div>
  }

  return (
    <div className="friend-bal-list">
      {entries.map(f => {
        const col = colorFor(f.name)
        return (
          <div key={f.id} className="fb-row">
            <span className="fb-av" style={{ background: col }}>{f.name[0]}</span>
            <span className="fb-name">{f.name}</span>
            <div className="fb-bar-wrap">
              <div className="fb-bar pos" style={{
                width: `${(f.total_owed / max) * 100}%`,
                background: 'var(--success)',
              }} />
            </div>
            <span className="fb-amt pos">owes you {fmtRupee(f.total_owed)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── AddSplitModal ────────────────────────────────────────────────────────────

function AddSplitModal({ friends, onClose }: {
  friends: FriendWithBalance[]
  onClose: () => void
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-add-asn" onClick={e => e.stopPropagation()}>
        <div className="asn-head">
          <button className="icon-btn" onClick={onClose}
            style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30 }}
            aria-label="Close">✕</button>
          <div className="amt-label">New split</div>
          <h3 className="asn-h">Share the <span className="hl">bill</span>.</h3>
        </div>
        <div className="body">
          <p style={{ color: 'var(--fg-2)', fontSize: 14, lineHeight: 1.6 }}>
            To create a split, use the full splits page.
            This quick view is for reviewing balances.
          </p>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {friends.filter(f => !f.deleted_at).slice(0, 8).map(f => (
              <span key={f.id} className="member-chip"
                style={{ background: colorFor(f.name) + '26', color: colorFor(f.name) }}>
                {f.name}
              </span>
            ))}
          </div>
        </div>
        <div className="footer">
          <button className="btn-cancel" onClick={onClose}>Close</button>
          <a href="/splits" className="btn-save" style={{ textDecoration: 'none' }}>
            Open Splits →
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

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

// ─── SplitRow ─────────────────────────────────────────────────────────────────

function SplitRow({ s, onSettle, onDel }: {
  s: SplitWithShares
  onSettle: (shareId: string) => void
  onDel: (id: string) => void
}) {
  const settled = s.status === 'settled'
  const totalOwed = s.shares.filter(sh => !sh.is_settled).reduce((t, sh) => t + sh.amount_owed, 0)
  const color = '#ffd24d'
  return (
    <div className={`asn-row ${settled ? 'done' : ''}`}>
      <span className="stripe" style={{ background: color }} />
      <span className="icon" style={{
        background: color + '26', color,
        width: 36, height: 36, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700,
      }}>₹</span>
      <div className="info">
        <div className="row1">
          <span className="subj-pill" style={{ color, background: color + '20' }}>
            {fmtRupee(s.total_amount)} total
          </span>
          {s.group_name && (
            <span className="pri-pill">{s.group_name}</span>
          )}
          <span className={`due-pill ${settled ? 'due-ok' : 'due-fine'}`}>
            {settled ? 'settled' : `${s.shares.length} ways`}
          </span>
        </div>
        <div className="title">{s.title}</div>
        <div className="meta">
          <span>{dayLabel(s.paid_at)}</span>
          <span>·</span>
          <span>{fmtRupee(s.total_amount / Math.max(1, s.shares.length))} each</span>
        </div>
        <div className="meta" style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {s.shares.map(sh => {
            const col = colorFor(sh.friend_name)
            return (
              <span key={sh.id} className="member-chip"
                style={{ background: col + '26', color: col,
                  textDecoration: sh.is_settled ? 'line-through' : 'none' }}>
                {sh.friend_name}
              </span>
            )
          })}
        </div>
      </div>
      <div className="progress-mini" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 120,
      }}>
        {!settled && totalOwed > 0 && (
          <span style={{ color: 'var(--success)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>
            + {fmtRupee(totalOwed)}
          </span>
        )}
        {settled && <span style={{ color: 'var(--fg-3)', fontSize: 13 }}>✓ settled</span>}
      </div>
      <div className="actions">
        {!settled && s.shares.some(sh => !sh.is_settled) && (
          <button className="pill-btn primary"
            onClick={() => {
              const unsettled = s.shares.find(sh => !sh.is_settled)
              if (unsettled) onSettle(unsettled.id)
            }}>
            Settle
          </button>
        )}
        <button className="icon-btn small" onClick={() => onDel(s.id)} title="Delete">✕</button>
      </div>
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

export function SplitsClient({
  initialSplits,
  initialFriends,
}: {
  initialSplits: SplitWithShares[]
  initialFriends: FriendWithBalance[]
}) {
  const chotu = useChotuActions()
  const [splits, setSplits] = useState(initialSplits)
  const [friends] = useState(initialFriends)
  const [filterStatus, setFilterStatus] = useState<'open' | 'settled' | 'all'>('open')
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (msg: string, kind = '') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500)
  }

  // computed
  const totalOwed = friends.reduce((t, f) => t + (f.deleted_at ? 0 : f.total_owed), 0)
  const openCount = splits.filter(s => s.status === 'pending').length

  const filtered = useMemo(() => {
    let r = splits
    if (filterStatus === 'open') r = r.filter(s => s.status === 'pending')
    else if (filterStatus === 'settled') r = r.filter(s => s.status === 'settled')
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(s => s.title.toLowerCase().includes(q))
    }
    return [...r].sort((a, b) => new Date(b.paid_at).getTime() - new Date(a.paid_at).getTime())
  }, [splits, filterStatus, search])

  const handleSettle = async (shareId: string) => {
    setSplits(p => p.map(s => ({
      ...s,
      shares: s.shares.map(sh => sh.id === shareId ? { ...sh, is_settled: true } : sh),
      status: s.shares.every(sh => sh.id === shareId || sh.is_settled) ? 'settled' : s.status,
    })))
    toast('Settled ✓', 'success')
    chotu?.celebrate('settled!')
    const result = await settleShare(shareId)
    if (result?.error) { toast(result.error, 'error') }
  }

  const handleDel = async (id: string) => {
    const split = splits.find(s => s.id === id)
    setSplits(p => p.filter(s => s.id !== id))
    toast(`Removed "${split?.title ?? 'split'}"`)
    const result = await deleteSplit(id)
    if (result?.error) {
      if (split) setSplits(p => [split, ...p])
      toast(result.error ?? 'Could not delete', 'error')
    }
  }

  return (
    <>
      <main className="exp-page">
        {/* HERO */}
        <section className="exp-hero">
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1>Splits.</h1>
            <p className="sub">
              {totalOwed > 0
                ? <>You&apos;re owed <span className="hl">{fmtRupee(totalOwed)}</span> across {friends.filter(f => !f.deleted_at && f.total_owed > 0).length} friends.</>
                : 'All settled. You\'re even with everyone.'}
            </p>
          </div>
          <button className="add-fab" onClick={() => setAddOpen(true)}>
            <span className="plus">+</span>
            New split
          </button>
        </section>

        {/* STATS */}
        <section className="exp-stats">
          <div className="exp-stat avg">
            <SplitsOwl />
            <div className="l">Net balance</div>
            <div className="v" style={{ color: totalOwed >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {totalOwed >= 0 ? '+' : '−'}{fmtRupee(totalOwed)}
              <small>{totalOwed >= 0 ? 'in your favor' : 'you owe'}</small>
            </div>
            <div className="spark" style={{ height: 8, borderRadius: 4, background: 'var(--bg-3)', overflow: 'hidden', marginTop: 12 }}>
              <div style={{
                width: `${splits.length ? ((splits.length - openCount) / splits.length) * 100 : 0}%`,
                height: '100%', background: 'var(--success)', transition: 'width .6s var(--ease-out)',
              }} />
            </div>
          </div>
          <div className="exp-stat">
            <div className="l">Open splits</div>
            <div className="v">{openCount}<small>{splits.length - openCount} settled</small></div>
            <div className="spark" style={{ height: 8, borderRadius: 4, background: 'var(--bg-3)', overflow: 'hidden', marginTop: 12 }}>
              <div style={{
                width: `${splits.length ? ((splits.length - openCount) / splits.length) * 100 : 0}%`,
                height: '100%', background: 'var(--success)', transition: 'width .6s var(--ease-out)',
              }} />
            </div>
          </div>
          <div className="exp-stat">
            <div className="l">You&apos;re owed</div>
            <div className="v" style={{ color: 'var(--success)' }}>
              {fmtRupee(totalOwed)}
              <small>across {friends.filter(f => !f.deleted_at && f.total_owed > 0).length}</small>
            </div>
          </div>
          <div className="exp-stat">
            <div className="l">Friends</div>
            <div className="v">{friends.filter(f => !f.deleted_at).length}<small>in your list</small></div>
          </div>
        </section>

        {/* FRIEND BALANCES */}
        <section className="exp-charts" style={{ gridTemplateColumns: '1fr' }}>
          <div className="exp-card">
            <div className="exp-card-head">
              <h3>By friend</h3>
              <span style={{ color: 'var(--fg-3)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>NET BALANCE</span>
            </div>
            <FriendBalances friends={friends} />
          </div>
        </section>

        {/* FILTERS */}
        <section className="exp-filters">
          <div className="left">
            {(['open', 'settled', 'all'] as const).map(k => (
              <span key={k}
                className={`month-chip${filterStatus === k ? ' active' : ''}`}
                onClick={() => setFilterStatus(k)}>
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </span>
            ))}
          </div>
          <div className="right">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{
                background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg-0)',
                padding: '8px 14px', borderRadius: 'var(--radius-pill)', fontSize: 13,
                outline: 0, width: 180, fontFamily: 'inherit',
              }} />
          </div>
        </section>

        {/* LIST */}
        <section className="exp-list">
          {filtered.length === 0 ? (
            <div className="exp-empty">
              <div className="big">No splits to show.</div>
            </div>
          ) : (
            <div className="day-group">
              {filtered.map(s => (
                <SplitRow key={s.id} s={s} onSettle={handleSettle} onDel={handleDel} />
              ))}
            </div>
          )}
        </section>
      </main>

      {addOpen && <AddSplitModal friends={friends} onClose={() => setAddOpen(false)} />}
      <Toasts toasts={toasts} />
    </>
  )
}
