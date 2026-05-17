import Link from 'next/link'
import type { PostWithMeta } from '@/types/community'
import { contentTypeLabel, contentTypeBadgeClass, expiryCountdown } from '@/lib/community-utils'

interface PostCardProps {
  post: PostWithMeta
}

export function PostCard({ post }: PostCardProps) {
  const uploaderLabel = post.is_anonymous ? 'Anonymous' : (post.uploader_name ?? 'Unknown')
  const expiry = expiryCountdown(post.expires_at)
  const isExpiringSoon = post.expires_at
    ? new Date(post.expires_at).getTime() - Date.now() < 3 * 24 * 60 * 60 * 1000
    : false

  return (
    <Link href={`/community/${post.id}`}>
      <article className="rounded-lg border bg-card p-4 hover:border-primary/60 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${contentTypeBadgeClass(post.content_type)}`}>
                {contentTypeLabel(post.content_type)}
              </span>
              {post.subject_tag && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {post.subject_tag}
                </span>
              )}
              {post.is_pinned && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  📌 Pinned
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="font-semibold text-sm leading-snug line-clamp-2">{post.title}</h3>

            {/* Description */}
            {post.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.description}</p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{uploaderLabel}</span>
              <span>·</span>
              <span>{new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              {isExpiringSoon && (
                <>
                  <span>·</span>
                  <span className="text-orange-500 font-medium">{expiry}</span>
                </>
              )}
            </div>
          </div>

          {/* Stats column */}
          <div className="flex flex-col items-center gap-2 shrink-0 text-xs text-muted-foreground min-w-[48px]">
            <div className="flex flex-col items-center">
              <span className={`font-semibold text-base leading-none ${post.vote_score > 0 ? 'text-green-600' : post.vote_score < 0 ? 'text-red-500' : ''}`}>
                {post.vote_score > 0 ? `+${post.vote_score}` : post.vote_score}
              </span>
              <span className="mt-0.5">votes</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-medium leading-none">{post.download_count}</span>
              <span className="mt-0.5">↓</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-medium leading-none">{post.comment_count}</span>
              <span className="mt-0.5">💬</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
