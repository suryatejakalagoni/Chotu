'use client'

import { AttachmentUpload as SharedAttachmentUpload } from '@/components/shared/attachment-upload'

interface Props {
  assignmentId: string
  currentCount: number
  maxCount?:    number
}

export function AttachmentUpload({ assignmentId, currentCount, maxCount = 5 }: Props) {
  return (
    <SharedAttachmentUpload
      entityId={assignmentId}
      entityType="assignment"
      currentCount={currentCount}
      maxCount={maxCount}
    />
  )
}
