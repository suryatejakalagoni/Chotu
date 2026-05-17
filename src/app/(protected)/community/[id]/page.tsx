import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getCommunityPost, getPostComments, deleteCommunityPost } from '@/lib/actions/community'
import { VoteButtons } from '@/components/community/vote-buttons'
import { DownloadButton } from '@/components/community/download-button'
import { CommentSection } from '@/components/community/comment-section'
import { ReportModal } from '@/components/community/report-modal'
import { contentTypeLabel, contentTypeBadgeClass, expiryCountdown } from '@/lib/community-utils'
import { DeletePostButton } from '@/components/community/delete-post-button'

export const metadata: Metadata = { title: 'Post — CHOTU' }

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PostDetailPage({ params }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const [postResult, commentsResult] = await Promise.all([
    getCommunityPost(id),
    getPostComments(id),
  ])

  if ('error' in postResult) notFound()
  const post = postResult.post
  const comments = 'error' in commentsResult ? [] : commentsResult.comments

  // Check admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.is_admin ?? false
  const isOwner = post.user_id === user.id

  const uploaderLabel = post.is_anonymous ? 'Anonymous' : (post.uploader_name ?? 'Unknown')

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Back */}
        <Link href="/community" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to community
        </Link>

        {/* Post header */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${contentTypeBadgeClass(post.content_type)}`}>
              {contentTypeLabel(post.content_type)}
            </span>
            {post.subject_tag && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {post.subject_tag}
              </span>
            )}
          </div>

          <h1 className="text-xl font-bold leading-snug">{post.title}</h1>

          {/* Meta */}
          <div className="text-xs text-muted-foreground flex flex-wrap gap-2">
            <span>Shared by <span className="font-medium text-foreground">{uploaderLabel}</span></span>
            <span>·</span>
            <span>{new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span>·</span>
            <span>{expiryCountdown(post.expires_at)}</span>
            <span>·</span>
            <span>{post.download_count} downloads</span>
          </div>

          {/* Description */}
          {post.description && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.description}</p>
          )}

          {/* File or link */}
          {post.content_type === 'link' && post.external_url ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">External resource:</p>
              <a
                href={post.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-sm underline break-all hover:opacity-80"
              >
                {post.external_url}
              </a>
            </div>
          ) : post.storage_key ? (
            <DownloadButton postId={post.id} />
          ) : (
            <p className="text-sm text-muted-foreground italic">File not yet available.</p>
          )}

          {/* Vote + actions row */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t">
            <VoteButtons
              postId={post.id}
              initialScore={post.vote_score}
              myVote={post.my_vote}
            />

            <div className="flex items-center gap-4 text-sm">
              {(isOwner || isAdmin) && (
                <DeletePostButton
                  postId={post.id}
                  deleteAction={deleteCommunityPost}
                />
              )}
              {!isOwner && (
                <ReportModal targetType="post" targetId={post.id} />
              )}
            </div>
          </div>
        </div>

        {/* Comments */}
        <div className="rounded-lg border bg-card p-5">
          <CommentSection
            postId={post.id}
            comments={comments}
            currentUserId={user.id}
          />
        </div>
      </div>
    </div>
  )
}
