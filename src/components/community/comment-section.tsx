'use client'

import type { CommentWithReplies } from '@/types/community'
import { CommentForm } from './comment-form'
import { CommentItem } from './comment-item'

interface CommentSectionProps {
  postId: string
  comments: CommentWithReplies[]
  currentUserId: string
}

export function CommentSection({ postId, comments, currentUserId }: CommentSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-base">
        Comments ({comments.reduce((n, c) => n + 1 + c.replies.length, 0)})
      </h2>

      <CommentForm postId={postId} placeholder="Add a comment…" />

      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No comments yet. Be the first!
        </p>
      ) : (
        <div className="space-y-1 divide-y">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              postId={postId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
