'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getCommunityFileUrl } from '@/lib/actions/community'

interface DownloadButtonProps {
  postId: string
  fileName?: string
}

export function DownloadButton({ postId, fileName }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleDownload() {
    setLoading(true)
    setError('')
    const result = await getCommunityFileUrl(postId)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    // Open in new tab — browser handles the download
    window.open(result.url, '_blank', 'noopener,noreferrer')
    setLoading(false)
  }

  return (
    <div className="space-y-1">
      <Button onClick={handleDownload} disabled={loading} variant="default">
        {loading ? 'Getting link…' : `⬇ Download${fileName ? ` "${fileName}"` : ''}`}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
