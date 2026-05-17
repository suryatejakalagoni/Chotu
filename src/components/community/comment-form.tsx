'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addComment } from '@/lib/actions/community'

interface CommentFormProps {
  postId: string
  parentId?: string
  onDone?: () => void
  placeholder?: string
  compact?: boolean
}

export function CommentForm({ postId, parentId, onDone, placeholder, compact }: CommentFormProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    const result = await addComment({ post_id: postId, parent_id: parentId ?? null, content: trimmed })
    if (result.error) {
      setError(result.error)
    } else {
      setContent('')
      onDone?.()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? 'space-y-2' : 'space-y-3'}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder ?? 'Write a comment…'}
        rows={compact ? 2 : 3}
        maxLength={1000}
        className="resize-none text-sm"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{content.length}/1000</span>
        <div className="flex gap-2">
          {onDone && (
            <Button type="button" variant="ghost" size="sm" onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={loading || !content.trim()}>
            {loading ? 'Posting…' : parentId ? 'Reply' : 'Comment'}
          </Button>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  )
}
