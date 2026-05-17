'use client'

import { AttachmentList as SharedAttachmentList } from '@/components/shared/attachment-list'
import type { Database } from '@/types/database.types'

type Attachment = Database['public']['Tables']['assignment_attachments']['Row']

interface Props {
  attachments: Attachment[]
}

export function AttachmentList({ attachments }: Props) {
  return <SharedAttachmentList attachments={attachments} entityType="assignment" />
}
