'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  examAttachmentMetaSchema,
  ALLOWED_EXTENSIONS,
  MAX_ATTACHMENTS_PER_EXAM,
  USER_STORAGE_LIMIT,
} from '@/lib/validations/exams'

const BUCKET = 'attachments'
const SIGNED_URL_TTL = 60 * 60

async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, user }
}

type UploadUrlResult =
  | { uploadUrl: string; token: string; storagePath: string; error?: never }
  | { error: string; uploadUrl?: never; token?: never; storagePath?: never }

export async function getExamUploadUrl(raw: unknown): Promise<UploadUrlResult> {
  const parsed = examAttachmentMetaSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid file' }

  const meta = parsed.data
  const ext = meta.file_name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.includes(`.${ext}`)) {
    return { error: 'File extension not allowed' }
  }

  try {
    const { supabase, user } = await getAuthUser()

    const { data: exam } = await supabase
      .from('exams')
      .select('id')
      .eq('id', meta.exam_id)
      .eq('user_id', user.id)
      .single()
    if (!exam) return { error: 'Exam not found' }

    const { count } = await supabase
      .from('exam_attachments')
      .select('*', { count: 'exact', head: true })
      .eq('exam_id', meta.exam_id)
      .eq('user_id', user.id)
    if ((count ?? 0) >= MAX_ATTACHMENTS_PER_EXAM) {
      return { error: `Max ${MAX_ATTACHMENTS_PER_EXAM} attachments per exam` }
    }

    const { data: userFiles } = await supabase
      .from('exam_attachments')
      .select('size_bytes')
      .eq('user_id', user.id)
    const totalUsed = userFiles?.reduce((s, f) => s + (f.size_bytes ?? 0), 0) ?? 0
    if (totalUsed + meta.size_bytes > USER_STORAGE_LIMIT) {
      const remainMB = ((USER_STORAGE_LIMIT - totalUsed) / (1024 * 1024)).toFixed(0)
      return { error: `Storage quota exceeded. ${remainMB} MB remaining.` }
    }

    const storagePath = `${user.id}/${meta.exam_id}/${crypto.randomUUID()}.${ext}`
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath)
    if (error || !data) {
      console.error('[getExamUploadUrl]', error?.message)
      return { error: 'Could not create upload URL. Try again.' }
    }

    return { uploadUrl: data.signedUrl, token: data.token, storagePath }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function recordExamAttachmentRow(
  examId: string,
  storagePath: string,
  originalName: string,
  mimeType: string,
  sizeBytes: number,
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase.from('exam_attachments').insert({
      exam_id:     examId,
      user_id:     user.id,
      storage_key: storagePath,
      file_name:   originalName,
      mime_type:   mimeType,
      size_bytes:  sizeBytes,
    })
    if (error) {
      console.error('[recordExamAttachmentRow]', error.message)
      return { error: 'Could not save attachment record.' }
    }
    revalidatePath('/exams')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

type DownloadResult =
  | { url: string; error?: never }
  | { error: string; url?: never }

export async function getExamAttachmentDownloadUrl(attachmentId: string): Promise<DownloadResult> {
  try {
    const { supabase, user } = await getAuthUser()
    const { data: attachment } = await supabase
      .from('exam_attachments')
      .select('storage_key')
      .eq('id', attachmentId)
      .eq('user_id', user.id)
      .single()
    if (!attachment) return { error: 'Attachment not found' }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(attachment.storage_key, SIGNED_URL_TTL)
    if (error || !data) return { error: 'Could not generate download link.' }
    return { url: data.signedUrl }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function deleteExamAttachment(attachmentId: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser()
    const { data: attachment } = await supabase
      .from('exam_attachments')
      .select('storage_key')
      .eq('id', attachmentId)
      .eq('user_id', user.id)
      .single()
    if (!attachment) return { error: 'Attachment not found' }

    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .remove([attachment.storage_key])
    if (storageErr) console.error('[deleteExamAttachment storage]', storageErr.message)

    const { error } = await supabase
      .from('exam_attachments')
      .delete()
      .eq('id', attachmentId)
      .eq('user_id', user.id)
    if (error) return { error: 'Could not delete attachment.' }

    revalidatePath('/exams')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}
