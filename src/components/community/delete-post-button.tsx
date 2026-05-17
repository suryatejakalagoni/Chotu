'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface DeletePostButtonProps {
  postId: string
  deleteAction: (id: string) => Promise<{ error?: string }>
}

export function DeletePostButton({ postId, deleteAction }: DeletePostButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleDelete() {
    if (!confirm('Delete this post? This cannot be undone.')) return
    setLoading(true)
    const result = await deleteAction(postId)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/community')
    }
  }

  return (
    <div>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={loading}
      >
        {loading ? 'Deleting…' : 'Delete post'}
      </Button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
