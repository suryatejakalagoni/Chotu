'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  attachmentMetaSchema,
  ALLOWED_EXTENSIONS,
  MAX_ATTACHMENTS_PER_ASSIGNMENT,
  USER_STORAGE_LIMIT,
} from '@/lib/validations/assignments'

const BUCKET = 'attachments'
const SIGNED_URL_TTL = 60 * 60 // 1 hour

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

export async function getAssignmentUploadUrl(raw: unknown): Promise<UploadUrlResult> {
  const parsed = attachmentMetaSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid file' }

  const meta = parsed.data

  // Server-side extension check (double-check beyond MIME)
  const ext = meta.file_name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.includes(`.${ext}`)) {
    return { error: 'File extension not allowed' }
  }

  try {
    const { supabase, user } = await getAuthUser()

    // Verify assignment belongs to this user
    const { data: assignment } = await supabase
      .from('assignments')
      .select('id')
      .eq('id', meta.assignment_id)
      .eq('user_id', user.id)
      .single()
    if (!assignment) return { error: 'Assignment not found' }

    // Check per-assignment attachment limit
    const { count } = await supabase
      .from('assignment_attachments')
      .select('*', { count: 'exact', head: true })
      .eq('assignment_id', meta.assignment_id)
      .eq('user_id', user.id)
    if ((count ?? 0) >= MAX_ATTACHMENTS_PER_ASSIGNMENT) {
      return { error: `Max ${MAX_ATTACHMENTS_PER_ASSIGNMENT} attachments per assignment` }
    }

    // Check user storage quota
    const { data: userFiles } = await supabase
      .from('assignment_attachments')
      .select('size_bytes')
      .eq('user_id', user.id)
    const totalUsed = userFiles?.reduce((s, f) => s + (f.size_bytes ?? 0), 0) ?? 0
    if (totalUsed + meta.size_bytes > USER_STORAGE_LIMIT) {
      const remainMB = ((USER_STORAGE_LIMIT - totalUsed) / (1024 * 1024)).toFixed(0)
      return { error: `Storage quota exceeded. ${remainMB} MB remaining.` }
    }

    // UUID-named path — never trust user filename in storage
    const storagePath = `${user.id}/${meta.assignment_id}/${crypto.randomUUID()}.${ext}`

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(storagePath)
    if (error || !data) {
      console.error('[getAssignmentUploadUrl]', error?.message)
      return { error: 'Could not create upload URL. Try again.' }
    }

    return { uploadUrl: data.signedUrl, token: data.token, storagePath }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function recordAttachmentRow(
  assignmentId: string,
  storagePath: string,
  originalName: string,
  mimeType: string,
  sizeBytes: number
): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase.from('assignment_attachments').insert({
      assignment_id: assignmentId,
      user_id:       user.id,
      storage_key:   storagePath,
      file_name:     originalName,
      mime_type:     mimeType,
      size_bytes:    sizeBytes,
    })
    if (error) {
      console.error('[recordAttachmentRow]', error.message)
      return { error: 'Could not save attachment record.' }
    }
    revalidatePath('/assignments')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}

type DownloadResult =
  | { url: string; error?: never }
  | { error: string; url?: never }

export async function getAttachmentDownloadUrl(attachmentId: string): Promise<DownloadResult> {
  try {
    const { supabase, user } = await getAuthUser()
    const { data: attachment } = await supabase
      .from('assignment_attachments')
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

export async function deleteAttachment(attachmentId: string): Promise<{ error?: string }> {
  try {
    const { supabase, user } = await getAuthUser()
    const { data: attachment } = await supabase
      .from('assignment_attachments')
      .select('storage_key')
      .eq('id', attachmentId)
      .eq('user_id', user.id)
      .single()
    if (!attachment) return { error: 'Attachment not found' }

    // Remove from storage first, then DB row
    const { error: storageErr } = await supabase.storage
      .from(BUCKET)
      .remove([attachment.storage_key])
    if (storageErr) console.error('[deleteAttachment storage]', storageErr.message)

    const { error } = await supabase
      .from('assignment_attachments')
      .delete()
      .eq('id', attachmentId)
      .eq('user_id', user.id)
    if (error) return { error: 'Could not delete attachment.' }

    revalidatePath('/assignments')
    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}
