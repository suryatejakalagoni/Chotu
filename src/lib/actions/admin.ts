'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ReportWithTarget } from '@/types/community'

async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, username')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) throw new Error('Forbidden')

  return { supabase, user, profile }
}

// ── Get pending reports ───────────────────────────────────────
type ReportsResult =
  | { reports: ReportWithTarget[]; error?: never }
  | { error: string; reports?: never }

export async function getPendingReports(): Promise<ReportsResult> {
  try {
    const { supabase } = await getAdminUser()

    const { data: rows, error } = await supabase
      .from('community_reports')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[getPendingReports]', error.message)
      return { error: 'Could not load reports.' }
    }

    if (!rows || rows.length === 0) return { reports: [] }

    // Collect all IDs we need
    const reporterIds  = [...new Set(rows.map((r) => r.reporter_id))]
    const postIds      = rows.map((r) => r.post_id).filter(Boolean) as string[]
    const commentIds   = rows.map((r) => r.comment_id).filter(Boolean) as string[]

    // Parallel lookups
    const [profilesRes, postsRes, commentsRes] = await Promise.all([
      supabase.from('profiles').select('id, username').in('id', reporterIds),
      postIds.length    > 0
        ? supabase.from('community_posts').select('id, title, user_id, is_anonymous').in('id', postIds)
        : Promise.resolve({ data: [] as { id: string; title: string; user_id: string; is_anonymous: boolean }[] }),
      commentIds.length > 0
        ? supabase.from('community_comments').select('id, content, user_id').in('id', commentIds)
        : Promise.resolve({ data: [] as { id: string; content: string; user_id: string }[] }),
    ])

    // Build profile map (reporter + post/comment authors)
    const allUserIds = [
      ...reporterIds,
      ...(postsRes.data ?? []).map((p) => p.user_id),
      ...(commentsRes.data ?? []).map((c) => c.user_id),
    ]
    const uniqueUserIds = [...new Set(allUserIds)]
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', uniqueUserIds)

    const profileMap: Record<string, string> = {}
    for (const p of allProfiles ?? []) {
      if (p.username) profileMap[p.id] = p.username
    }
    // Also use reporter profiles fetched above
    for (const p of profilesRes.data ?? []) {
      if (p.username) profileMap[p.id] = p.username
    }

    const postMap = Object.fromEntries((postsRes.data ?? []).map((p) => [p.id, p]))
    const commentMap = Object.fromEntries((commentsRes.data ?? []).map((c) => [c.id, c]))

    const reports: ReportWithTarget[] = rows.map((r) => {
      const post    = r.post_id    ? postMap[r.post_id]       : null
      const comment = r.comment_id ? commentMap[r.comment_id] : null

      return {
        id:            r.id,
        reporter_id:   r.reporter_id,
        reporter_name: profileMap[r.reporter_id] ?? 'Unknown',
        post_id:       r.post_id,
        comment_id:    r.comment_id,
        reason:        r.reason,
        resolved:      r.resolved,
        resolved_at:   r.resolved_at,
        resolved_by:   r.resolved_by,
        created_at:    r.created_at,
        target_title: post
          ? post.title
          : comment
            ? comment.content.slice(0, 80)
            : null,
        // Admin sees "Anonymous" for anonymous posts — same as regular UI
        target_author: post
          ? (post.is_anonymous ? 'Anonymous' : (profileMap[post.user_id] ?? null))
          : comment
            ? (profileMap[comment.user_id] ?? null)
            : null,
      }
    })

    return { reports }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return { error: msg === 'Forbidden' ? 'Forbidden' : 'Could not load reports.' }
  }
}

// ── Mark report resolved ──────────────────────────────────────
export async function resolveReport(reportId: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAdminUser()
    const { error } = await supabase
      .from('community_reports')
      .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: user.id })
      .eq('id', reportId)
    if (error) return { error: 'Could not resolve report.' }
    revalidatePath('/admin/reports')
    return {}
  } catch (e) {
    return { error: e instanceof Error && e.message === 'Forbidden' ? 'Forbidden' : 'Not authenticated.' }
  }
}

// ── Delete post (admin) ───────────────────────────────────────
export async function adminDeletePost(
  postId: string,
  reportId?: string
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAdminUser()
    const BUCKET = 'community-files'

    const { data: post } = await supabase
      .from('community_posts')
      .select('id, storage_key')
      .eq('id', postId)
      .single()
    if (!post) return { error: 'Post not found.' }

    if (post.storage_key) {
      const { error: sErr } = await supabase.storage
        .from(BUCKET)
        .remove([post.storage_key])
      if (sErr) console.error('[adminDeletePost storage]', sErr.message)
    }

    // Use admin client to bypass RLS ownership check
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    await admin.from('community_posts').delete().eq('id', postId)

    if (reportId) {
      await admin
        .from('community_reports')
        .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: user.id })
        .eq('id', reportId)
    }

    revalidatePath('/admin/reports')
    revalidatePath('/community')
    return {}
  } catch (e) {
    return { error: e instanceof Error && e.message === 'Forbidden' ? 'Forbidden' : 'Not authenticated.' }
  }
}

// ── Delete comment (admin) ────────────────────────────────────
export async function adminDeleteComment(
  commentId: string,
  reportId?: string
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAdminUser()

    const { data: comment } = await supabase
      .from('community_comments')
      .select('id, post_id')
      .eq('id', commentId)
      .single()
    if (!comment) return { error: 'Comment not found.' }

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    await admin
      .from('community_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)

    if (reportId) {
      await admin
        .from('community_reports')
        .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: user.id })
        .eq('id', reportId)
    }

    revalidatePath('/admin/reports')
    revalidatePath(`/community/${comment.post_id}`)
    return {}
  } catch (e) {
    return { error: e instanceof Error && e.message === 'Forbidden' ? 'Forbidden' : 'Not authenticated.' }
  }
}
