'use client'

import { useState } from 'react'
import type { CommentWithReplies } from '@/types/community'
import { updateComment, deleteComment } from '@/lib/actions/community'
import { CommentForm } from './comment-form'
import { ReportModal } from './report-modal'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface CommentItemProps {
  comment: CommentWithReplies
  currentUserId: string
  postId: string
  depth?: number
}

export function CommentItem({ comment, currentUserId, postId, depth = 0 }: CommentItemProps) {
  const [replying, setReplying]   = useState(false)
  const [editing, setEditing]     = useState(false)
  const [editBody, setEditBody]   = useState(comment.content)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [deleted, setDeleted]     = useState(false)
  const [localContent, setLocalContent] = useState(comment.content)

  const isOwner = comment.user_id === currentUserId
  const isDeleted = deleted || !!comment.deleted_at

  async function handleEditSave() {
    if (!editBody.trim()) return
    setLoading(true)
    const result = await updateComment({ id: comment.id, content: editBody.trim() })
    if (result.error) {
      setError(result.error)
    } else {
      setLocalContent(editBody.trim())
      setEditing(false)
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this comment?')) return
    setLoading(true)
    const result = await deleteComment(comment.id)
    if (result.error) {
      setError(result.error)
    } else {
      setDeleted(true)
    }
    setLoading(false)
  }

  if (isDeleted) {
    return (
      <div className={`${depth > 0 ? 'ml-6 border-l pl-4' : ''}`}>
        <p className="text-xs text-muted-foreground italic py-1">[comment removed]</p>
      </div>
    )
  }

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l pl-4' : ''}`}>
      {/* Comment bubble */}
      <div className="py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span className="font-medium text-foreground">{comment.author_name}</span>
          <span>·</span>
          <span>{new Date(comment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          {comment.updated_at !== comment.created_at && (
            <span className="italic">(edited)</span>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <Textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={2}
              maxLength={1000}
              className="text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEditSave} disabled={loading}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditBody(localContent) }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{localContent}</p>
        )}

        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

        {/* Actions */}
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
          {depth === 0 && (
            <button
              onClick={() => setReplying(!replying)}
              className="hover:text-foreground transition-colors"
            >
              {replying ? 'Cancel' : 'Reply'}
            </button>
          )}
          {isOwner && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="hover:text-foreground transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="hover:text-red-500 transition-colors"
              >
                Delete
              </button>
            </>
          )}
          {!isOwner && (
            <ReportModal targetType="comment" targetId={comment.id} />
          )}
        </div>
      </div>

      {/* Reply form */}
      {replying && depth === 0 && (
        <div className="ml-6 border-l pl-4 pb-2">
          <CommentForm
            postId={postId}
            parentId={comment.id}
            onDone={() => setReplying(false)}
            placeholder={`Reply to ${comment.author_name}…`}
            compact
          />
        </div>
      )}

      {/* Replies */}
      {comment.replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          currentUserId={currentUserId}
          postId={postId}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}
