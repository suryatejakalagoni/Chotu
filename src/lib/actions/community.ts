'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  postSchema,
  communityFileMeta,
  voteSchema,
  commentSchema,
  commentUpdateSchema,
  reportSchema,
  feedParamsSchema,
  ALLOWED_COMMUNITY_MIMES,
  BLOCKED_EXTENSIONS,
  checkMagicBytes,
  PAGE_SIZE,
} from '@/lib/validations/community'
import {
  uploadRateLimitKey,
  commentRateLimitKey,
  voteRateLimitKey,
} from '@/lib/community-utils'
import type { PostWithMeta, CommentWithReplies, ReportWithTarget } from '@/types/community'

const BUCKET = 'community-files'
const SIGNED_URL_TTL = 60 * 60 // 1 hour

// Derive a safe extension from the validated MIME type — never trust user-supplied name.
function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png':  'png',
    'image/webp': 'webp',
    'image/gif':  'gif',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':  'docx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':        'xlsx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
  }
  return map[mime] ?? 'bin'
}

// Returns true if this MIME type should always be downloaded rather than rendered.
function shouldForceDownload(mime: string): boolean {
  return mime !== 'image/jpeg' && mime !== 'image/png' &&
         mime !== 'image/webp' && mime !== 'image/gif'
}

// ── Auth helper ───────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, user }
}

// ── Rate limit helper (reuses rate_limits table) ──────────────

async function checkRateLimit(key: string, maxCount: number, windowMs: number): Promise<boolean> {
  const admin = createAdminClient()
  const windowStart = new Date(Date.now() - windowMs).toISOString()
  const { count } = await admin
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('key', key)
    .gte('attempted_at', windowStart)
  if ((count ?? 0) >= maxCount) return false
  await admin.from('rate_limits').insert({ key })
  return true
}

// ── Get upload URL for community file ────────────────────────
type UploadUrlResult =
  | { uploadUrl: string; token: string; storagePath: string; error?: never }
  | { error: string; uploadUrl?: never; token?: never; storagePath?: never }

export async function getCommunityUploadUrl(raw: unknown): Promise<UploadUrlResult> {
  const parsed = communityFileMeta.safeParse(raw)
  if (!parsed.success) {
    const hasSizeError = parsed.error.issues.some(i => i.path[0] === 'size_bytes')
    if (hasSizeError) {
      const sizeBytes =
        raw !== null && typeof raw === 'object' && 'size_bytes' in raw &&
        typeof (raw as Record<string, unknown>).size_bytes === 'number'
          ? (raw as { size_bytes: number }).size_bytes
          : null
      const mb = sizeBytes !== null ? (sizeBytes / 1024 / 1024).toFixed(2) : null
      return { error: mb ? `File is ${mb} MB — exceeds the 10 MB limit.` : 'File exceeds the 10 MB limit.' }
    }
    return { error: 'File type not allowed.' }
  }

  const meta = parsed.data

  // Explicit block check on declared filename extension (defense-in-depth)
  const declaredExt = `.${meta.file_name.split('.').pop()?.toLowerCase() ?? ''}`
  if (BLOCKED_EXTENSIONS.includes(declaredExt as typeof BLOCKED_EXTENSIONS[number])) {
    return { error: 'File type not allowed.' }
  }

  // Confirm MIME is on the allowlist (redundant with zod enum, belt-and-suspenders)
  if (!ALLOWED_COMMUNITY_MIMES.includes(meta.mime_type as typeof ALLOWED_COMMUNITY_MIMES[number])) {
    return { error: 'File type not allowed.' }
  }

  try {
    const { supabase, user } = await getAuthUser()

    const allowed = await checkRateLimit(uploadRateLimitKey(user.id), 5, 60_000)
    if (!allowed) return { error: 'Too many uploads. Wait a minute.' }

    // Extension is derived from the validated MIME type — never from user-supplied filename.
    const ext = mimeToExt(meta.mime_type)
    const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath)
    if (error || !data) {
      console.error('[getCommunityUploadUrl]', error?.message)
      return { error: 'Could not create upload URL. Try again.' }
    }
    return { uploadUrl: data.signedUrl, token: data.token, storagePath }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ── Create post ───────────────────────────────────────────────
type CreatePostResult = { id: string; error?: never } | { error: string; id?: never }

export async function createCommunityPost(raw: unknown): Promise<CreatePostResult> {
  const parsed = postSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const data = parsed.data

  // Extra URL safety check
  if (data.external_url) {
    try {
      const url = new URL(data.external_url)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return { error: 'Only http/https URLs allowed' }
      }
    } catch {
      return { error: 'Invalid URL' }
    }
  }

  try {
    const { supabase, user } = await getAuthUser()

    const { data: post, error } = await supabase
      .from('community_posts')
      .insert({
        user_id:      user.id,
        title:        data.title,
        subject_tag:  data.subject_tag || '',      // NOT NULL in old schema
        content_type: data.content_type,
        description:  data.description || '',      // NOT NULL in old schema (was content)
        storage_key:  null,                        // set later via setCommunityPostStorageKey
        external_url: data.external_url ?? null,
        is_anonymous: data.is_anonymous,
        expires_at:   data.expires_at ?? null,
      })
      .select('id')
      .single()

    if (error || !post) {
      console.error('[createCommunityPost] DB error:', error?.code, error?.message, error?.details)
      return { error: 'Could not create post. Try again.' }
    }

    revalidatePath('/community')
    return { id: post.id }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ── Verify uploaded file (magic bytes) then link to post ─────
// Replaces the old setCommunityPostStorageKey — this version fetches the first
// 16 bytes of the stored object via a short-lived signed URL and checks them
// against the expected magic bytes before committing the storage_key to the DB.
// If the check fails the object is deleted from storage and an error is returned.
export async function verifyAndLinkCommunityFile(
  postId: string,
  storagePath: string,
  mimeType: string,
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser()

    // Confirm post belongs to the authenticated user (RLS also enforces this)
    const { data: post } = await supabase
      .from('community_posts')
      .select('id')
      .eq('id', postId)
      .eq('user_id', user.id)
      .single()
    if (!post) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      return { error: 'Post not found.' }
    }

    // Generate a 20-second signed URL just for reading the magic bytes
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 20)
    if (signErr || !signed) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      console.error('[verifyAndLinkCommunityFile] sign error', signErr?.message)
      return { error: 'Could not verify file.' }
    }

    // Fetch first 16 bytes via Range header — sufficient for all magic byte patterns
    let magicOk = false
    try {
      const res = await fetch(signed.signedUrl, { headers: { Range: 'bytes=0-15' } })
      if (res.ok || res.status === 206) {
        const buf = new Uint8Array(await res.arrayBuffer())
        magicOk = checkMagicBytes(buf, mimeType)
      }
    } catch (err) {
      console.error('[verifyAndLinkCommunityFile] fetch error', err)
    }

    if (!magicOk) {
      await supabase.storage.from(BUCKET).remove([storagePath])
      console.error('[verifyAndLinkCommunityFile] magic bytes mismatch', { storagePath, mimeType })
      return { error: 'File validation failed. Upload rejected.' }
    }

    // Commit the storage key
    const { error: updateErr } = await supabase
      .from('community_posts')
      .update({ storage_key: storagePath })
      .eq('id', postId)
      .eq('user_id', user.id)
    if (updateErr) {
      console.error('[verifyAndLinkCommunityFile] DB error', updateErr.message)
      return { error: 'Could not save file link.' }
    }

    revalidatePath('/community')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ── Delete post (owner or admin) ──────────────────────────────
export async function deleteCommunityPost(postId: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser()

    // Verify ownership (RLS also enforces, this gives a clean error)
    const { data: post } = await supabase
      .from('community_posts')
      .select('id, user_id, storage_key')
      .eq('id', postId)
      .single()
    if (!post) return { error: 'Post not found.' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    const isAdmin = profile?.is_admin ?? false

    if (post.user_id !== user.id && !isAdmin) {
      return { error: 'Not authorised.' }
    }

    if (post.storage_key) {
      const { error: storageErr } = await supabase.storage
        .from(BUCKET)
        .remove([post.storage_key])
      if (storageErr) console.error('[deleteCommunityPost storage]', storageErr.message)
    }

    const { error } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId)
    if (error) return { error: 'Could not delete post.' }

    revalidatePath('/community')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ── Get feed ──────────────────────────────────────────────────
type FeedResult =
  | { posts: PostWithMeta[]; total: number; error?: never }
  | { error: string; posts?: never; total?: never }

export async function getCommunityFeed(raw: unknown): Promise<FeedResult> {
  const parsed = feedParamsSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Invalid params' }
  const params = parsed.data

  try {
    const { supabase, user } = await getAuthUser()

    // Base query — RLS already filters deleted_at IS NULL
    let query = supabase
      .from('community_posts')
      .select('*', { count: 'exact' })

    if (params.content_type) query = query.eq('content_type', params.content_type)
    if (params.subject_tag)  query = query.ilike('subject_tag', `%${params.subject_tag}%`)
    if (params.search)       query = query.ilike('title', `%${params.search}%`)

    // Sort
    if (params.sort === 'newest') {
      query = query.order('created_at', { ascending: false })
    } else if (params.sort === 'downloads') {
      query = query.order('download_count', { ascending: false })
    } else {
      // top / popular — sort client-side after fetching votes
      query = query.order('created_at', { ascending: false })
    }

    // Pagination
    const from = (params.page - 1) * PAGE_SIZE
    query = query.range(from, from + PAGE_SIZE - 1)

    const { data: rows, count, error } = await query
    if (error) {
      console.error('[getCommunityFeed]', error.message)
      return { error: 'Could not load posts.' }
    }

    const postIds    = (rows ?? []).map((r) => r.id)
    const uploaderIds = [...new Set((rows ?? []).map((r) => r.user_id))]

    // Parallel: votes + my votes + comment counts + uploader profiles
    const [votesRes, myVotesRes, commentCountsRes, profilesRes] = await Promise.all([
      supabase.from('community_votes').select('post_id, value').in('post_id', postIds),
      supabase.from('community_votes').select('post_id, value').in('post_id', postIds).eq('user_id', user.id),
      supabase.from('community_comments').select('post_id').in('post_id', postIds).is('deleted_at', null),
      supabase.from('profiles').select('id, username').in('id', uploaderIds),
    ])

    // Build lookup maps
    const voteMap: Record<string, number> = {}
    for (const v of votesRes.data ?? []) {
      voteMap[v.post_id] = (voteMap[v.post_id] ?? 0) + v.value
    }
    const myVoteMap: Record<string, 1 | -1> = {}
    for (const v of myVotesRes.data ?? []) {
      myVoteMap[v.post_id] = v.value as 1 | -1
    }
    const commentMap: Record<string, number> = {}
    for (const c of commentCountsRes.data ?? []) {
      commentMap[c.post_id] = (commentMap[c.post_id] ?? 0) + 1
    }
    const profileMap: Record<string, string> = {}
    for (const p of profilesRes.data ?? []) {
      if (p.username) profileMap[p.id] = p.username
    }

    const posts: PostWithMeta[] = (rows ?? []).map((r) => ({
      id:            r.id,
      title:         r.title,
      subject_tag:   r.subject_tag,
      content_type:  r.content_type,
      description:   r.description,
      storage_key:   r.storage_key,
      external_url:  r.external_url,
      is_anonymous:  r.is_anonymous,
      is_pinned:     r.is_pinned,
      expires_at:    r.expires_at,
      deleted_at:    r.deleted_at,
      download_count: r.download_count,
      created_at:    r.created_at,
      updated_at:    r.updated_at,
      user_id:       r.user_id,
      uploader_name: r.is_anonymous ? null : (profileMap[r.user_id] ?? null),
      vote_score:    voteMap[r.id] ?? 0,
      my_vote:       myVoteMap[r.id] ?? null,
      comment_count: commentMap[r.id] ?? 0,
    }))

    // Client-side sort for top/popular
    if (params.sort === 'top') {
      posts.sort((a, b) => b.vote_score - a.vote_score)
    } else if (params.sort === 'popular') {
      const score = (p: PostWithMeta) =>
        p.vote_score + Math.log10(p.download_count + 1)
      posts.sort((a, b) => score(b) - score(a))
    }

    return { posts, total: count ?? 0 }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ── Get single post ───────────────────────────────────────────
type PostResult = { post: PostWithMeta; error?: never } | { error: string; post?: never }

export async function getCommunityPost(postId: string): Promise<PostResult> {
  try {
    const { supabase, user } = await getAuthUser()

    const { data: r, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', postId)
      .single()
    if (error || !r) return { error: 'Post not found.' }

    const [voteRes, myVoteRes, commentCountRes, profileRes] = await Promise.all([
      supabase.from('community_votes').select('value').eq('post_id', postId),
      supabase.from('community_votes').select('value').eq('post_id', postId).eq('user_id', user.id).maybeSingle(),
      supabase.from('community_comments').select('id', { count: 'exact', head: true }).eq('post_id', postId).is('deleted_at', null),
      supabase.from('profiles').select('username').eq('id', r.user_id).maybeSingle(),
    ])

    const voteScore = (voteRes.data ?? []).reduce((s, v) => s + v.value, 0)

    const post: PostWithMeta = {
      id:            r.id,
      title:         r.title,
      subject_tag:   r.subject_tag,
      content_type:  r.content_type,
      description:   r.description,
      storage_key:   r.storage_key,
      external_url:  r.external_url,
      is_anonymous:  r.is_anonymous,
      is_pinned:     r.is_pinned,
      expires_at:    r.expires_at,
      deleted_at:    r.deleted_at,
      download_count: r.download_count,
      created_at:    r.created_at,
      updated_at:    r.updated_at,
      user_id:       r.user_id,
      uploader_name: r.is_anonymous ? null : (profileRes.data?.username ?? null),
      vote_score:    voteScore,
      my_vote:       (myVoteRes.data?.value as 1 | -1 | undefined) ?? null,
      comment_count: commentCountRes.count ?? 0,
    }
    return { post }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ── Download: signed URL + increment count ────────────────────
type DownloadResult = { url: string; error?: never } | { error: string; url?: never }

export async function getCommunityFileUrl(postId: string): Promise<DownloadResult> {
  try {
    const { supabase } = await getAuthUser()

    const { data: post } = await supabase
      .from('community_posts')
      .select('id, storage_key')
      .eq('id', postId)
      .single()
    if (!post?.storage_key) return { error: 'File not found.' }

    // Derive MIME from the stored extension — never trust DB-stored user-reported type.
    const storedExt = post.storage_key.split('.').pop()?.toLowerCase() ?? ''
    const extToMime: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      webp: 'image/webp', gif: 'image/gif',
      pdf: 'application/pdf', txt: 'text/plain',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }
    const mime = extToMime[storedExt] ?? 'application/octet-stream'

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(post.storage_key, SIGNED_URL_TTL, {
        // Force download (Content-Disposition: attachment) for all non-image types.
        // Images may render inline — they cannot execute in-browser.
        // PDFs, docs, and text files are forced to download to prevent in-browser execution.
        download: shouldForceDownload(mime),
      })
    if (error || !data) return { error: 'Could not generate download link.' }

    // Atomic increment via RPC (fire-and-forget, failure is non-fatal)
    supabase.rpc('increment_community_download', { post_id: postId }).then(() => {/* ignore */})

    return { url: data.signedUrl }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ── Vote (upsert / toggle) ────────────────────────────────────
export async function voteCommunityPost(raw: unknown): Promise<{ error?: string }> {
  const parsed = voteSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { post_id, value } = parsed.data

  try {
    const { supabase, user } = await getAuthUser()

    const allowed = await checkRateLimit(voteRateLimitKey(user.id), 60, 60_000)
    if (!allowed) return { error: 'Too many votes. Slow down.' }

    // Cannot vote on own post
    const { data: post } = await supabase
      .from('community_posts')
      .select('user_id')
      .eq('id', post_id)
      .single()
    if (!post) return { error: 'Post not found.' }
    if (post.user_id === user.id) return { error: 'Cannot vote on your own post.' }

    // Check existing vote
    const { data: existing } = await supabase
      .from('community_votes')
      .select('value')
      .eq('post_id', post_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.value === value) {
        // Toggle off: remove vote
        await supabase
          .from('community_votes')
          .delete()
          .eq('post_id', post_id)
          .eq('user_id', user.id)
      } else {
        // Change vote direction
        await supabase
          .from('community_votes')
          .update({ value })
          .eq('post_id', post_id)
          .eq('user_id', user.id)
      }
    } else {
      await supabase
        .from('community_votes')
        .insert({ post_id, user_id: user.id, value })
    }

    revalidatePath(`/community/${post_id}`)
    revalidatePath('/community')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ── Comments ──────────────────────────────────────────────────
export async function getPostComments(postId: string): Promise<{
  comments: CommentWithReplies[]
  error?: never
} | { error: string; comments?: never }> {
  try {
    const { supabase } = await getAuthUser()

    const { data: rows, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', postId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (error) return { error: 'Could not load comments.' }

    // Fetch commenter profiles in one shot
    const commenterIds = [...new Set((rows ?? []).map((c) => c.user_id))]
    const { data: commentProfiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', commenterIds)
    const commentProfileMap: Record<string, string> = {}
    for (const p of commentProfiles ?? []) {
      if (p.username) commentProfileMap[p.id] = p.username
    }

    const all = rows ?? []
    const topLevel = all.filter((c) => !c.parent_id)
    const replies = all.filter((c) => c.parent_id)

    const comments: CommentWithReplies[] = topLevel.map((c) => ({
      id:         c.id,
      post_id:    c.post_id,
      parent_id:  c.parent_id,
      content:    c.content,
      created_at: c.created_at,
      updated_at: c.updated_at,
      deleted_at: c.deleted_at,
      user_id:    c.user_id,
      author_name: commentProfileMap[c.user_id] ?? 'Unknown',
      replies: replies
        .filter((r) => r.parent_id === c.id)
        .map((r) => ({
          id:         r.id,
          post_id:    r.post_id,
          parent_id:  r.parent_id,
          content:    r.content,
          created_at: r.created_at,
          updated_at: r.updated_at,
          deleted_at: r.deleted_at,
          user_id:    r.user_id,
          author_name: commentProfileMap[r.user_id] ?? 'Unknown',
          replies: [],
        })),
    }))

    return { comments }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function addComment(raw: unknown): Promise<{ error?: string }> {
  const parsed = commentSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { post_id, parent_id, content } = parsed.data

  try {
    const { supabase, user } = await getAuthUser()

    const allowed = await checkRateLimit(commentRateLimitKey(user.id), 20, 60_000)
    if (!allowed) return { error: 'Too many comments. Slow down.' }

    const { error } = await supabase.from('community_comments').insert({
      post_id,
      parent_id: parent_id ?? null,
      content,
      user_id: user.id,
    })
    if (error) {
      console.error('[addComment]', error.message)
      // DB trigger will raise exception for nesting > 1 level
      if (error.message.includes('nesting')) return { error: 'Cannot reply to a reply.' }
      return { error: 'Could not post comment.' }
    }

    revalidatePath(`/community/${post_id}`)
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function updateComment(raw: unknown): Promise<{ error?: string }> {
  const parsed = commentUpdateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { id, content } = parsed.data

  try {
    const { supabase, user } = await getAuthUser()

    const { data: comment } = await supabase
      .from('community_comments')
      .select('id, post_id, user_id')
      .eq('id', id)
      .single()
    if (!comment) return { error: 'Comment not found.' }
    if (comment.user_id !== user.id) return { error: 'Not authorised.' }

    const { error } = await supabase
      .from('community_comments')
      .update({ content })
      .eq('id', id)
    if (error) return { error: 'Could not update comment.' }

    revalidatePath(`/community/${comment.post_id}`)
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function deleteComment(commentId: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser()

    const { data: comment } = await supabase
      .from('community_comments')
      .select('id, post_id, user_id')
      .eq('id', commentId)
      .single()
    if (!comment) return { error: 'Comment not found.' }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    const isAdmin = profile?.is_admin ?? false

    if (comment.user_id !== user.id && !isAdmin) return { error: 'Not authorised.' }

    // Soft delete
    const { error } = await supabase
      .from('community_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId)
    if (error) return { error: 'Could not delete comment.' }

    revalidatePath(`/community/${comment.post_id}`)
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ── Reports ───────────────────────────────────────────────────
export async function reportContent(raw: unknown): Promise<{ error?: string }> {
  const parsed = reportSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  const { target_type, target_id, reason } = parsed.data

  try {
    const { supabase, user } = await getAuthUser()

    // Cannot report own content
    if (target_type === 'post') {
      const { data: post } = await supabase
        .from('community_posts')
        .select('user_id')
        .eq('id', target_id)
        .single()
      if (!post) return { error: 'Post not found.' }
      if (post.user_id === user.id) return { error: 'Cannot report your own post.' }
    } else {
      const { data: comment } = await supabase
        .from('community_comments')
        .select('user_id')
        .eq('id', target_id)
        .single()
      if (!comment) return { error: 'Comment not found.' }
      if (comment.user_id === user.id) return { error: 'Cannot report your own comment.' }
    }

    const { error } = await supabase.from('community_reports').insert({
      reporter_id: user.id,
      post_id:     target_type === 'post'    ? target_id : null,
      comment_id:  target_type === 'comment' ? target_id : null,
      reason,
    })
    if (error) {
      console.error('[reportContent]', error.message)
      return { error: 'Could not submit report.' }
    }

    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}
