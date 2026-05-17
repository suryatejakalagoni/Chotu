'use client'

import { useState, useTransition } from 'react'
import { voteCommunityPost } from '@/lib/actions/community'

interface VoteButtonsProps {
  postId: string
  initialScore: number
  myVote: 1 | -1 | null
}

export function VoteButtons({ postId, initialScore, myVote: initMyVote }: VoteButtonsProps) {
  const [score, setScore]   = useState(initialScore)
  const [myVote, setMyVote] = useState<1 | -1 | null>(initMyVote)
  const [isPending, startTransition] = useTransition()
  const [error, setError]   = useState('')

  function handleVote(value: 1 | -1) {
    const prevScore  = score
    const prevMyVote = myVote

    // Optimistic update
    if (myVote === value) {
      // Toggle off
      setScore(score - value)
      setMyVote(null)
    } else if (myVote) {
      // Change direction: remove old + add new
      setScore(score - myVote + value)
      setMyVote(value)
    } else {
      // New vote
      setScore(score + value)
      setMyVote(value)
    }

    startTransition(async () => {
      const result = await voteCommunityPost({ post_id: postId, value })
      if (result.error) {
        // Revert on error
        setScore(prevScore)
        setMyVote(prevMyVote)
        setError(result.error)
      } else {
        setError('')
      }
    })
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleVote(1)}
          disabled={isPending}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors
            ${myVote === 1
              ? 'bg-green-100 border-green-400 text-green-800'
              : 'hover:bg-green-50 hover:border-green-300'
            }`}
        >
          ▲ Upvote
        </button>

        <span className={`text-lg font-bold tabular-nums min-w-[2.5rem] text-center
          ${score > 0 ? 'text-green-600' : score < 0 ? 'text-red-500' : 'text-muted-foreground'}`}
        >
          {score > 0 ? `+${score}` : score}
        </span>

        <button
          onClick={() => handleVote(-1)}
          disabled={isPending}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors
            ${myVote === -1
              ? 'bg-red-100 border-red-400 text-red-700'
              : 'hover:bg-red-50 hover:border-red-300'
            }`}
        >
          ▼ Downvote
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
