'use client'

import { useState } from 'react'
import { getAttachmentDownloadUrl, deleteAttachment } from '@/lib/actions/attachments'
import { Button } from '@/components/ui/button'
import type { Database } from '@/types/database.types'

type Attachment = Database['public']['Tables']['assignment_attachments']['Row']

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mimeType: string | null): string {
  if (!mimeType) return '📎'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.startsWith('image/')) return '🖼'
  if (mimeType.includes('word')) return '📝'
  return '📎'
}

interface Props {
  attachments: Attachment[]
}

export function AttachmentList({ attachments }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [errors, setErrors]           = useState<Record<string, string>>({})

  if (attachments.length === 0) return null

  async function handleDownload(id: string) {
    setDownloading(id)
    const result = await getAttachmentDownloadUrl(id)
    setDownloading(null)
    if (result.error) {
      setErrors((prev) => ({ ...prev, [id]: result.error! }))
      return
    }
    window.open(result.url, '_blank', 'noopener,noreferrer')
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this attachment?')) return
    setDeleting(id)
    const result = await deleteAttachment(id)
    setDeleting(null)
    if (result.error) setErrors((prev) => ({ ...prev, [id]: result.error! }))
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Attachments ({attachments.length})
      </p>
      {attachments.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 text-sm"
        >
          <span className="text-base">{fileIcon(a.mime_type)}</span>
          <span className="flex-1 truncate font-medium">{a.file_name}</span>
          <span className="text-muted-foreground text-xs shrink-0">{formatBytes(a.size_bytes)}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={downloading === a.id}
            onClick={() => handleDownload(a.id)}
          >
            {downloading === a.id ? '…' : 'Download'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            disabled={deleting === a.id}
            onClick={() => handleDelete(a.id)}
          >
            {deleting === a.id ? '…' : 'Delete'}
          </Button>
          {errors[a.id] && (
            <span className="text-xs text-destructive">{errors[a.id]}</span>
          )}
        </div>
      ))}
    </div>
  )
}
