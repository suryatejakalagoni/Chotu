'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import imageCompression from 'browser-image-compression'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CONTENT_TYPES,
  MAX_COMMUNITY_FILE_SIZE,
  ALLOWED_COMMUNITY_MIMES,
  ALLOWED_COMMUNITY_EXTENSIONS,
  BLOCKED_EXTENSIONS,
} from '@/lib/validations/community'
import { expiryOptionToDate, contentTypeLabel, type ExpiryOption } from '@/lib/community-utils'
import {
  getCommunityUploadUrl,
  createCommunityPost,
  verifyAndLinkCommunityFile,
} from '@/lib/actions/community'

// ── Client-side constants ─────────────────────────────────────

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.xlsx,.pptx,.txt'

const COMPRESSIBLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// Fallback: derive MIME from extension when browser reports "" or octet-stream
const EXT_TO_MIME: Record<string, string> = {
  pdf:  'application/pdf',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif:  'image/gif',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt:  'text/plain',
}

// ── File entry type ───────────────────────────────────────────

type FileStatus =
  | 'validating'
  | 'valid'
  | 'format-error'
  | 'size-error'
  | 'compressing'
  | 'uploading'
  | 'done'
  | 'upload-error'

type FileEntry = {
  id: string
  file: File
  status: FileStatus
  error?: string
  originalSize: number
  compressedSize?: number
  resolvedMime: string
}

// ── Helpers ───────────────────────────────────────────────────

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function getExt(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? ''
}

// ── Client-side validation (async — reads magic bytes for PDF) ─

async function validateFile(
  file: File,
): Promise<Pick<FileEntry, 'status' | 'error' | 'resolvedMime'>> {
  const dotExt = `.${getExt(file.name)}` as typeof BLOCKED_EXTENSIONS[number]

  // ── Format check (always before size check) ───────────────
  if (BLOCKED_EXTENSIONS.includes(dotExt)) {
    return { status: 'format-error', error: 'File type not allowed.', resolvedMime: '' }
  }
  if (!ALLOWED_COMMUNITY_EXTENSIONS.includes(dotExt as typeof ALLOWED_COMMUNITY_EXTENSIONS[number])) {
    return {
      status: 'format-error',
      error: 'Unsupported file type. Allowed: PDF, PNG, JPG, WebP, GIF, DOCX, XLSX, PPTX, TXT.',
      resolvedMime: '',
    }
  }

  const ext = getExt(file.name)

  // Prefer browser-reported MIME if it's on the allowlist; fall back to extension.
  // Browsers sometimes report "" or "application/octet-stream" for valid PDFs.
  const resolvedMime: string = ALLOWED_COMMUNITY_MIMES.includes(
    file.type as typeof ALLOWED_COMMUNITY_MIMES[number],
  )
    ? file.type
    : (EXT_TO_MIME[ext] ?? '')

  if (!resolvedMime) {
    return { status: 'format-error', error: 'Unsupported file type.', resolvedMime: '' }
  }

  // PDF: verify magic bytes (%PDF = 0x25 0x50 0x44 0x46) regardless of browser MIME.
  // Catches renamed files and browsers that report octet-stream.
  if (resolvedMime === 'application/pdf') {
    try {
      const buf = new Uint8Array(await file.slice(0, 4).arrayBuffer())
      if (!(buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)) {
        return { status: 'format-error', error: 'Not a valid PDF file.', resolvedMime: '' }
      }
    } catch {
      // Cannot read bytes — allow through; server magic-byte check is the final gate
    }
  }

  // ── Size check ───────────────────────────────────────────────────────────
  if (file.size > MAX_COMMUNITY_FILE_SIZE) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    const hint = resolvedMime === 'application/pdf'
      ? ` Compress it first at ilovepdf.com.`
      : ''
    return {
      status: 'size-error',
      error: `File is ${mb} MB — exceeds the 10 MB limit.${hint}`,
      resolvedMime,
    }
  }

  return { status: 'valid', resolvedMime }
}

// ── Image compression ─────────────────────────────────────────

async function compressImage(file: File): Promise<File> {
  const c = await imageCompression(file, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.7,
  })
  return c.size < file.size ? c : file
}

// ── Dispatch to the right compressor ─────────────────────────

async function compressFile(file: File, resolvedMime: string): Promise<File> {
  // Images: use browser-image-compression
  if (COMPRESSIBLE_IMAGE_TYPES.has(resolvedMime)) {
    return compressImage(file).catch(() => file)
  }
  // PDF / DOCX / XLSX / PPTX / TXT / GIF: pass through
  return file
}

// ── Form schema ───────────────────────────────────────────────

const formSchema = z.object({
  title:         z.string().min(1, 'Required').max(200),
  subject_tag:   z.string().max(50).optional(),
  content_type:  z.enum(CONTENT_TYPES),
  description:   z.string().max(2000).optional(),
  is_anonymous:  z.boolean(),
  expiry_option: z.enum(['7d', '30d', '90d', 'semester', 'never'] as const),
  external_url:  z.string().url().optional().or(z.literal('')),
})
type FormValues = z.infer<typeof formSchema>

const EXPIRY_OPTIONS: { value: ExpiryOption; label: string }[] = [
  { value: '7d',       label: '7 days' },
  { value: '30d',      label: '30 days' },
  { value: '90d',      label: '90 days' },
  { value: 'semester', label: 'End of semester' },
  { value: 'never',    label: 'Never' },
]

// ── Component ─────────────────────────────────────────────────

export function PostForm() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [fileEntries, setFileEntries] = useState<FileEntry[]>([])
  const [isDragging, setIsDragging]   = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { content_type: 'notes', is_anonymous: false, expiry_option: '30d' },
  })

  const contentType = watch('content_type')
  const isLink = contentType === 'link'

  // ── Add + validate files ──────────────────────────────────

  const addFiles = useCallback(async (incoming: File[]) => {
    if (!incoming.length) return

    const staged: FileEntry[] = incoming.map((f) => ({
      id:           crypto.randomUUID(),
      file:         f,
      status:       'validating' as FileStatus,
      originalSize: f.size,
      resolvedMime: '',
    }))

    setFileEntries((prev) => [...prev, ...staged])

    for (const entry of staged) {
      const result = await validateFile(entry.file)
      setFileEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, status: result.status, error: result.error, resolvedMime: result.resolvedMime }
            : e,
        ),
      )
    }
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  // ── Drag-and-drop (multiple files) ────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }

  function removeFile(id: string) {
    setFileEntries((prev) => prev.filter((e) => e.id !== id))
  }

  // ── Upload one file entry ─────────────────────────────────

  async function uploadEntry(
    entry: FileEntry,
    values: FormValues,
    expires_at: string | null,
  ): Promise<boolean> {
    const patch = (p: Partial<FileEntry>) =>
      setFileEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, ...p } : e)))

    try {
      patch({ status: 'compressing' })

      const compressed = await compressFile(entry.file, entry.resolvedMime)

      const compressedMime = compressed.type || entry.resolvedMime

      // ── Re-validate after compression (belt-and-suspenders) ──
      if (compressedMime === 'application/pdf') {
        try {
          const buf = new Uint8Array(await compressed.slice(0, 4).arrayBuffer())
          if (!(buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)) {
            patch({ status: 'upload-error', error: 'Compressed file failed magic-byte check.' })
            return false
          }
        } catch { /* worker already checked — proceed */ }
      }
      if (compressed.size > MAX_COMMUNITY_FILE_SIZE) {
        const mb = (compressed.size / 1024 / 1024).toFixed(2)
        patch({
          status: 'upload-error',
          error: `File is ${mb} MB after compression — exceeds the 10 MB limit.`,
        })
        return false
      }

      patch({ compressedSize: compressed.size, status: 'uploading' })

      // Server validates MIME enum + size + renames to UUID before R2 upload
      const urlResult = await getCommunityUploadUrl({
        mime_type:  compressedMime,
        file_name:  compressed.name,
        size_bytes: compressed.size,
      })
      if (urlResult.error) { patch({ status: 'upload-error', error: urlResult.error }); return false }

      const uploadRes = await fetch(urlResult.uploadUrl!, {
        method: 'PUT',
        body: compressed,
        headers: { 'Content-Type': compressedMime },
      })
      if (!uploadRes.ok) {
        patch({ status: 'upload-error', error: 'Upload failed. Try again.' })
        return false
      }

      const postResult = await createCommunityPost({
        title:        values.title,
        subject_tag:  values.subject_tag || undefined,
        content_type: values.content_type,
        description:  values.description || undefined,
        is_anonymous: values.is_anonymous,
        expires_at,
        file_meta: {
          mime_type:  entry.resolvedMime,
          file_name:  entry.file.name,
          size_bytes: compressed.size,
        },
      })
      if (postResult.error) { patch({ status: 'upload-error', error: postResult.error }); return false }

      // Server reads first 16 bytes via Range request and re-checks magic bytes
      const verifyResult = await verifyAndLinkCommunityFile(
        postResult.id!, // discriminated union; id always present when error is absent
        urlResult.storagePath!,
        compressedMime,
      )
      if (verifyResult.error) {
        patch({ status: 'upload-error', error: verifyResult.error })
        return false
      }

      patch({ status: 'done' })
      return true
    } catch (err) {
      patch({
        status: 'upload-error',
        error: err instanceof Error ? err.message : 'Something went wrong. Try again.',
      })
      return false
    }
  }

  // ── Submit ────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    setError('')
    setSubmitting(true)

    try {
      const expires_at = expiryOptionToDate(values.expiry_option as ExpiryOption)

      if (isLink) {
        const result = await createCommunityPost({
          title:        values.title,
          subject_tag:  values.subject_tag || undefined,
          content_type: values.content_type,
          description:  values.description || undefined,
          is_anonymous: values.is_anonymous,
          expires_at,
          external_url: values.external_url || undefined,
        })
        if (result.error) { setError(result.error); return }
        router.push('/community')
        return
      }

      const validEntries = fileEntries.filter((e) => e.status === 'valid')
      if (!validEntries.length) {
        setError('Add at least one valid file before sharing.')
        return
      }

      const results: boolean[] = []
      for (const entry of validEntries) {
        results.push(await uploadEntry(entry, values, expires_at))
      }

      if (results.every(Boolean)) {
        router.push('/community')
      } else {
        setError('Some files failed — see details above.')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Per-file status label ─────────────────────────────────

  function statusNode(e: FileEntry): React.ReactNode {
    switch (e.status) {
      case 'validating':
        return <span className="text-muted-foreground">Checking…</span>

      case 'valid':
        return (
          <span className="text-green-600 dark:text-green-400">
            Ready · {fmtBytes(e.originalSize)}
          </span>
        )

      case 'format-error':
      case 'size-error':
        return <span className="text-red-500">{e.error}</span>

      case 'compressing':
        return <span className="text-muted-foreground animate-pulse">Compressing…</span>

      case 'uploading':
        return <span className="text-muted-foreground animate-pulse">Uploading…</span>

      case 'done':
        return (
          <span className="text-green-600 dark:text-green-400">
            Shared
            {e.compressedSize !== undefined && e.compressedSize < e.originalSize && (
              <span className="text-muted-foreground">
                {' '}· {fmtBytes(e.originalSize)} → {fmtBytes(e.compressedSize)}
              </span>
            )}
          </span>
        )

      case 'upload-error':
        return <span className="text-red-500">{e.error}</span>
    }
  }

  const validCount  = fileEntries.filter((e) => e.status === 'valid').length
  const isUploading = fileEntries.some(
    (e) => e.status === 'compressing' || e.status === 'uploading',
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" placeholder="e.g. Maths unit 3 notes" {...register('title')} />
        {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
      </div>

      {/* Content type */}
      <div className="space-y-1">
        <Label>Content type *</Label>
        <Select
          defaultValue="notes"
          onValueChange={(v) => v && setValue('content_type', v as typeof CONTENT_TYPES[number])}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPES.map((ct) => (
              <SelectItem key={ct} value={ct}>{contentTypeLabel(ct)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subject tag */}
      <div className="space-y-1">
        <Label htmlFor="subject_tag">Subject / tag</Label>
        <Input id="subject_tag" placeholder="e.g. Mathematics, Physics" {...register('subject_tag')} />
        {errors.subject_tag && <p className="text-sm text-red-500">{errors.subject_tag.message}</p>}
      </div>

      {/* File picker or URL */}
      {isLink ? (
        <div className="space-y-1">
          <Label htmlFor="external_url">URL *</Label>
          <Input
            id="external_url"
            type="url"
            placeholder="https://youtube.com/playlist?..."
            {...register('external_url')}
          />
          {errors.external_url && (
            <p className="text-sm text-red-500">{errors.external_url.message}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Files * (PDF, PNG, JPG, WebP, GIF, DOCX, XLSX, PPTX, TXT)</Label>

          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            className={[
              'border-2 border-dashed rounded-lg px-4 py-6 text-center cursor-pointer',
              'transition-colors select-none',
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30',
            ].join(' ')}
          >
            <p className="text-sm text-muted-foreground">
              Drag files here or{' '}
              <span className="text-primary font-medium">browse</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max 10 MB per file · multiple files allowed
            </p>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              multiple
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>

          {/* File list */}
          {fileEntries.length > 0 && (
            <ul className="space-y-1.5" aria-label="Selected files">
              {fileEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-foreground">{entry.file.name}</p>
                    <p className="text-xs mt-0.5">{statusNode(entry)}</p>

                  </div>

                  {/* Remove button — hidden while this entry is actively processing */}
                  {!submitting &&
                    entry.status !== 'compressing' &&
                    entry.status !== 'uploading' && (
                      <button
                        type="button"
                        onClick={() => removeFile(entry.id)}
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={`Remove ${entry.file.name}`}
                      >
                        <X size={14} />
                      </button>
                    )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="What's in this file? Anything classmates should know?"
          rows={3}
          {...register('description')}
        />
        {errors.description && <p className="text-sm text-red-500">{errors.description.message}</p>}
      </div>

      {/* Expiry */}
      <div className="space-y-1">
        <Label>Expires after</Label>
        <Select
          defaultValue="30d"
          onValueChange={(v) => v && setValue('expiry_option', v as ExpiryOption)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPIRY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Anonymous toggle */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="anon"
          className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
          onChange={(e) => setValue('is_anonymous', e.target.checked)}
        />
        <Label htmlFor="anon" className="cursor-pointer">
          Post anonymously
          <span className="ml-1 text-xs text-muted-foreground">(classmates will see "Anonymous")</span>
        </Label>
      </div>

      {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

      <Button
        type="submit"
        disabled={submitting || isUploading}
        className="w-full"
      >
        {submitting || isUploading
          ? 'Uploading…'
          : !isLink && validCount > 1
            ? `Share ${validCount} files with class`
            : 'Share with class'}
      </Button>
    </form>
  )
}
