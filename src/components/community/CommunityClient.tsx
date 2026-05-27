'use client'

import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import { ChotuOwl } from '@/components/chotu/ChotuOwl'
import { useChotuActions } from '@/components/chotu/ChotuStage'
import { voteCommunityPost, deleteCommunityPost } from '@/lib/actions/community'
import type { PostWithMeta } from '@/types/community'

// ─── constants ────────────────────────────────────────────────────────────────

const TYPES: Record<string, { label: string; color: string; glyph: string }> = {
  assignment: { label: 'Assignment', color: '#fbbf24', glyph: '✎' },
  solution:   { label: 'Solution',   color: '#10b981', glyph: '✓' },
  paper:      { label: 'Paper',      color: '#3b82f6', glyph: '◰' },
  notes:      { label: 'Notes',      color: '#fbbf24', glyph: '✎' },
  syllabus:   { label: 'Syllabus',   color: '#a855f7', glyph: '◐' },
  link:       { label: 'Link',       color: '#ec4899', glyph: '↗' },
}

const SUBJ_TAGS = ['physics', 'maths', 'cs', 'chem', 'english', 'ee', 'ml', 'history']

// ─── helpers ─────────────────────────────────────────────────────────────────

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60000); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  const d = Math.floor(h / 24); if (d < 30) return `${d}d`
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })
}

function colorFor(name: string) {
  const palette = ['#ffd24d', '#f97316', '#ec4899', '#3b82f6', '#10b981', '#a855f7']
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return palette[h % palette.length]
}

// ─── CommunityOwl ─────────────────────────────────────────────────────────────

function CommunityOwl() {
  const [look, setLook] = useState({ x: 0, y: 0.6 })
  const [mood, setMood] = useState<'normal' | 'happy' | 'surprised'>('normal')
  const [bubble, setBubble] = useState<string | null>(null)
  useEffect(() => {
    const states = [
      { look: { x: -0.7, y: 0.6 }, mood: 'normal' as const, bubble: null,    ms: 1100 },
      { look: { x: 0.7,  y: 0.6 }, mood: 'normal' as const, bubble: 'ooh',   ms: 1300 },
      { look: { x: -0.5, y: 0.8 }, mood: 'normal' as const, bubble: 'read',  ms: 1400 },
      { look: { x: 0,  y: -0.1  }, mood: 'happy'  as const, bubble: 'share!',ms: 1400 },
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
    <div className="community-owl" style={{ position: 'relative', width: 80 }}>
      {bubble && <div className="counting-bubble">{bubble}</div>}
      <ChotuOwl mood={mood} look={look} size={64} />
      <div className="scroll-paper">
        <span className="line" /><span className="line" /><span className="line short" />
      </div>
    </div>
  )
}

// ─── ActivityChart ────────────────────────────────────────────────────────────

function ActivityChart({ posts }: { posts: PostWithMeta[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0)
    return { date: d, count: 0 }
  })
  posts.forEach(p => {
    const pd = new Date(p.created_at); pd.setHours(0, 0, 0, 0)
    const idx = days.findIndex(d => d.date.getTime() === pd.getTime())
    if (idx >= 0) days[idx].count++
  })
  const max = Math.max(1, ...days.map(d => d.count))
  return (
    <div className="activity">
      {days.map((d, i) => (
        <div key={i} className="act-day">
          <div className="act-bar-wrap">
            <div className="act-bar" style={{
              height: `${(d.count / max) * 100}%`,
              background: d.count ? 'var(--accent)' : 'var(--bg-4)',
            }}>
              {d.count > 0 && <span className="act-count">{d.count}</span>}
            </div>
          </div>
          <div className="act-lbl">
            <span className="dow" suppressHydrationWarning>{d.date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short' })}</span>
            <span className="dom" suppressHydrationWarning>{d.date.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric' })}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── TopContributors ──────────────────────────────────────────────────────────

function TopContributors({ posts }: { posts: PostWithMeta[] }) {
  const counts: Record<string, number> = {}
  posts.forEach(p => {
    if (p.is_anonymous || !p.uploader_name) return
    counts[p.uploader_name] = (counts[p.uploader_name] ?? 0) + 1
  })
  const entries = Object.entries(counts)
    .map(([n, c]) => ({ name: n, count: c }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  if (entries.length === 0) {
    return <div className="exp-empty" style={{ padding: 20 }}><div className="big">No contributors yet.</div></div>
  }
  return (
    <div className="contrib-list">
      {entries.map((e, i) => (
        <div key={e.name} className="contrib-row">
          <span className="rank">#{i + 1}</span>
          <span className="c-av" style={{ background: colorFor(e.name) }}>{e.name[0]}</span>
          <span className="c-name">{e.name}</span>
          <span className="c-count">{e.count} <small style={{ color: 'var(--fg-3)' }}>post{e.count > 1 ? 's' : ''}</small></span>
        </div>
      ))}
    </div>
  )
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({ p, onVote, onDel, userId }: {
  p: PostWithMeta
  onVote: (id: string, v: 1 | -1) => void
  onDel: (id: string) => void
  userId: string
}) {
  const t = TYPES[p.content_type] ?? { label: p.content_type, color: '#888', glyph: '•' }
  const isOwn = p.user_id === userId

  return (
    <div className="post-card">
      <div className="vote-col">
        <button
          className={`vote-btn up${p.my_vote === 1 ? ' on' : ''}`}
          onClick={() => !isOwn && onVote(p.id, 1)}
          title={isOwn ? 'Cannot vote on own post' : 'Upvote'}
          disabled={isOwn}
        >▲</button>
        <span className="vote-count" style={{
          color: p.vote_score > 0 ? 'var(--accent)' : p.vote_score < 0 ? 'var(--danger)' : 'var(--fg-2)',
        }}>{p.vote_score}</span>
        <button
          className={`vote-btn down${p.my_vote === -1 ? ' on' : ''}`}
          onClick={() => !isOwn && onVote(p.id, -1)}
          title={isOwn ? 'Cannot vote on own post' : 'Downvote'}
          disabled={isOwn}
        >▼</button>
      </div>
      <div className="post-body">
        <div className="post-head">
          <span className="type-pill" style={{ color: t.color, background: t.color + '22' }}>
            {t.glyph} {t.label}
          </span>
          {p.subject_tag && <span className="tag-pill">#{p.subject_tag}</span>}
          <span className="post-meta">
            {p.is_anonymous ? <em>Anonymous</em> : (p.uploader_name ?? 'Unknown')} · {relTime(p.created_at)}
            {p.expires_at && new Date(p.expires_at).getTime() - Date.now() < 30 * 24 * 3600 * 1000 && (
              <> · <span style={{ color: 'var(--warn)' }}>
                expires in {Math.ceil((new Date(p.expires_at).getTime() - Date.now()) / (24 * 3600 * 1000))}d
              </span></>
            )}
          </span>
        </div>
        <Link href={`/community/${p.id}`} className="post-title" style={{ textDecoration: 'none' }}>
          {p.title}
        </Link>
        {p.storage_key && (
          <div className="post-file">
            <span>📄</span>
            <span>{p.title}</span>
            <span className="post-file-size">{p.download_count} downloads</span>
            <Link href={`/community/${p.id}`} className="pill-btn primary" style={{ textDecoration: 'none' }}>
              Download
            </Link>
          </div>
        )}
        {p.external_url && (
          <div className="post-file">
            <span>↗</span>
            <span style={{ color: 'var(--accent)', fontSize: 13 }}>{p.external_url}</span>
          </div>
        )}
        <div className="post-actions">
          <span>💬 {p.comment_count} comment{p.comment_count !== 1 ? 's' : ''}</span>
          {isOwn && (
            <button className="dash-linklike" onClick={() => onDel(p.id)}
              style={{ color: 'var(--danger)', marginLeft: 'auto' }}>
              Delete
            </button>
          )}
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

// ─── main ─────────────────────────────────────────────────────────────────────

export function CommunityClient({
  initialPosts,
  userId,
}: {
  initialPosts: PostWithMeta[]
  userId: string
}) {
  const chotu = useChotuActions()
  const [posts, setPosts] = useState(initialPosts)
  const [filterType, setFilterType] = useState<string | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'top' | 'downloads'>('newest')
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (msg: string, kind = '') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, kind }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500)
  }

  // stats
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000
  const weekCount = posts.filter(p => new Date(p.created_at).getTime() > weekAgo).length
  const contribCount = new Set(posts.filter(p => !p.is_anonymous && p.uploader_name).map(p => p.uploader_name)).size
  const anonPct = Math.round((posts.filter(p => p.is_anonymous).length / Math.max(1, posts.length)) * 100)
  const topTag = useMemo(() => {
    const m: Record<string, number> = {}
    posts.forEach(p => { if (p.subject_tag) m[p.subject_tag] = (m[p.subject_tag] ?? 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
  }, [posts])

  const filtered = useMemo(() => {
    let r = posts
    if (filterType) r = r.filter(p => p.content_type === filterType)
    if (filterTag) r = r.filter(p => p.subject_tag?.toLowerCase() === filterTag)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(p => p.title.toLowerCase().includes(q))
    }
    r = [...r]
    if (sort === 'newest') r.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    else if (sort === 'top') r.sort((a, b) => b.vote_score - a.vote_score)
    else if (sort === 'downloads') r.sort((a, b) => b.download_count - a.download_count)
    return r
  }, [posts, filterType, filterTag, search, sort])

  const handleVote = async (id: string, v: 1 | -1) => {
    setPosts(p => p.map(x => {
      if (x.id !== id) return x
      let delta = 0
      if (x.my_vote === 1) delta -= 1
      if (x.my_vote === -1) delta += 1
      if (v === 1) delta += 1
      if (v === -1) delta -= 1
      return { ...x, vote_score: x.vote_score + delta, my_vote: x.my_vote === v ? null : v }
    }))
    const result = await voteCommunityPost({ post_id: id, value: v })
    if (result?.error) toast(result.error, 'error')
  }

  const handleDel = async (id: string) => {
    const post = posts.find(p => p.id === id)
    setPosts(p => p.filter(x => x.id !== id))
    toast('Post removed')
    chotu?.react('shy', 'poof')
    const result = await deleteCommunityPost(id)
    if (result?.error) {
      if (post) setPosts(p => [post, ...p])
      toast(result.error, 'error')
    }
  }

  return (
    <>
      <main className="exp-page">
        {/* HERO */}
        <section className="exp-hero">
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1>Community.</h1>
            <p className="sub">
              <span className="hl">{weekCount} new {weekCount === 1 ? 'resource' : 'resources'}</span> this week from {contribCount} of your batchmates.
            </p>
          </div>
          <Link href="/community/new" className="add-fab" style={{ textDecoration: 'none' }}>
            <span className="plus">+</span>
            Share
          </Link>
        </section>

        {/* STATS */}
        <section className="exp-stats">
          <div className="exp-stat avg">
            <CommunityOwl />
            <div className="l">Posts this week</div>
            <div className="v">{weekCount}<small>of {posts.length} total</small></div>
            <div className="spark" style={{ height: 8, borderRadius: 4, background: 'var(--bg-3)', overflow: 'hidden', marginTop: 12 }}>
              <div style={{
                width: `${(weekCount / Math.max(1, posts.length)) * 100}%`,
                height: '100%', background: 'var(--accent)', transition: 'width .6s var(--ease-out)',
              }} />
            </div>
          </div>
          <div className="exp-stat">
            <div className="l">Contributors</div>
            <div className="v">{contribCount}<small>active</small></div>
            <div className="spark" style={{ display: 'flex', alignItems: 'center', height: 28, marginTop: 12, color: 'var(--fg-3)', fontSize: 11 }}>
              Of 64 in your batch
            </div>
          </div>
          <div className="exp-stat">
            <div className="l">Top tag</div>
            <div className="v" style={{ textTransform: 'capitalize' }}>
              {topTag}<small>most posts</small>
            </div>
          </div>
          <div className="exp-stat">
            <div className="l">Anonymous</div>
            <div className="v">{anonPct}%<small>of posts</small></div>
            <div className="spark" style={{ height: 8, borderRadius: 4, background: 'var(--bg-3)', overflow: 'hidden', marginTop: 12 }}>
              <div style={{ width: `${anonPct}%`, height: '100%', background: 'var(--fg-2)', transition: 'width .6s var(--ease-out)' }} />
            </div>
          </div>
        </section>

        {/* CHARTS */}
        <section className="exp-charts" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
          <div className="exp-card">
            <div className="exp-card-head">
              <h3>Activity</h3>
              <span style={{ color: 'var(--fg-3)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>LAST 7 DAYS</span>
            </div>
            <ActivityChart posts={posts} />
          </div>
          <div className="exp-card">
            <div className="exp-card-head"><h3>Top sharers</h3></div>
            <TopContributors posts={posts} />
          </div>
        </section>

        {/* FILTERS */}
        <section className="exp-filters">
          <div className="left">
            <span className={`cat-filter-chip${!filterType ? ' active' : ''}`}
              onClick={() => setFilterType(null)}>All types</span>
            {Object.entries(TYPES).map(([k, c]) => (
              <span key={k}
                className={`cat-filter-chip${filterType === k ? ' active' : ''}`}
                onClick={() => setFilterType(x => x === k ? null : k)}>
                <span className="dot" style={{ background: c.color }} />{c.label}
              </span>
            ))}
            <span style={{ width: 1, background: 'var(--line-2)', margin: '0 8px' }} />
            <span className={`cat-filter-chip${!filterTag ? ' active' : ''}`}
              onClick={() => setFilterTag(null)}>All subjects</span>
            {SUBJ_TAGS.slice(0, 5).map(t => (
              <span key={t}
                className={`cat-filter-chip${filterTag === t ? ' active' : ''}`}
                onClick={() => setFilterTag(x => x === t ? null : t)}>
                #{t}
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
            <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
              style={{
                background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--fg-0)',
                padding: '8px 14px', borderRadius: 'var(--radius-pill)', fontSize: 13,
                outline: 0, fontFamily: 'inherit',
              }}>
              <option value="newest">Newest</option>
              <option value="top">Top voted</option>
              <option value="downloads">Most downloaded</option>
            </select>
          </div>
        </section>

        {/* POST GRID */}
        <section className="exp-list">
          {filtered.length === 0 ? (
            <div className="exp-empty">
              <div className="big">Nothing matches.</div>
              <div style={{ marginTop: 8, color: 'var(--fg-3)' }}>
                <Link href="/community/new" style={{ color: 'var(--accent)' }}>Be the first to share</Link> something with your batch.
              </div>
            </div>
          ) : (
            <div className="post-grid">
              {filtered.map(p => (
                <PostCard key={p.id} p={p} onVote={handleVote} onDel={handleDel} userId={userId} />
              ))}
            </div>
          )}
        </section>
      </main>

      <Toasts toasts={toasts} />
    </>
  )
}
