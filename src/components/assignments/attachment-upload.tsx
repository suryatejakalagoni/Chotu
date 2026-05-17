'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAssignmentUploadUrl, recordAttachmentRow } from '@/lib/actions/attachments'
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/validations/assignments'
import { Button } from '@/components/ui/button'

const BUCKET = 'attachments'

interface Props {
  assignmentId: string
  currentCount: number
  maxCount?: number
}

export function AttachmentUpload({ assignmentId, currentCount, maxCount = 5 }: Props) {
  const inputRef        = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [progress, setProgress]   = useState<string | null>(null)

  const disabled = currentCount >= maxCount || uploading

  async function handleFile(file: File) {
    setError(null)

    // Client-side quick checks (server re-validates everything)
    if (file.size > MAX_FILE_SIZE) {
      setError('File must be under 50 MB')
      return
    }
    const ext = '.' + (file.name.split('.').pop()?.toLowerCase() ?? '')
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`)
      return
    }

    setUploading(true)
    setProgress('Preparing upload…')

    // 1. Get signed upload URL from server (validates quota, count, MIME, ext)
    const urlResult = await getAssignmentUploadUrl({
      assignment_id: assignmentId,
      file_name:     file.name,
      size_bytes:    file.size,
      mime_type:     file.type,
      extension:     ext,
    })

    if (urlResult.error) {
      setError(urlResult.error)
      setUploading(false)
      setProgress(null)
      return
    }

    // Safe after error guard — TypeScript narrowing via explicit extraction
    const { uploadUrl: _unused, token, storagePath } = urlResult as {
      uploadUrl: string; token: string; storagePath: string
    }

    // 2. Upload directly to Supabase Storage (file never touches Next.js)
    setProgress('Uploading…')
    const supabase = createClient()
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .uploadToSignedUrl(storagePath, token, file)

    if (uploadErr) {
      setError('Upload failed. Please try again.')
      setUploading(false)
      setProgress(null)
      return
    }

    // 3. Record attachment row in DB
    setProgress('Saving…')
    const recordResult = await recordAttachmentRow(
      assignmentId,
      storagePath,
      file.name,
      file.type,
      file.size
    )

    setUploading(false)
    setProgress(null)

    if (recordResult.error) {
      setError(recordResult.error)
      return
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-uploaded after error
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_EXTENSIONS.join(',')}
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (progress ?? 'Uploading…') : `Attach File (${currentCount}/${maxCount})`}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!error && (
        <p className="text-xs text-muted-foreground">
          PDF, PNG, JPG, DOCX, TXT, MD · max 50 MB each
        </p>
      )}
    </div>
  )
}
