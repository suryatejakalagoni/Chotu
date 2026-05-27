'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import imageCompression from 'browser-image-compression'
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

// Images that can be compressed. GIFs are skipped (may be animated).
const COMPRESSIBLE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

// ── Compression pipeline ──────────────────────────────────────

async function compressImage(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp', // output WebP where browser supports it; falls back gracefully
    initialQuality: 0.7,
    // EXIF/GPS metadata is stripped automatically during canvas re-encode
  })
  // Only use compressed if it's actually smaller (some tiny images may grow)
  return compressed.size < file.size ? compressed : file
}

async function compressPdf(file: File): Promise<File> {
  try {
    // Dynamic import keeps pdf-lib out of the initial bundle
    const { PDFDocument } = await import('pdf-lib')
    const buf = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(buf, { ignoreEncryption: true })
    const saved = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false })
    // .slice() copies bytes into a new ArrayBuffer, resolving SharedArrayBuffer TS conflicts
    const blob = new Blob([saved.slice()], { type: 'application/pdf' })
    const compressed = new File([blob], file.name, { type: 'application/pdf' })
    return compressed.size < file.size ? compressed : file
  } catch {
    // If pdf-lib can't parse it (encrypted, malformed), upload original
    return file
  }
}

async function compressFile(
  file: File,
  onStatus: (s: string) => void,
): Promise<File> {
  if (COMPRESSIBLE_IMAGE_TYPES.has(file.type)) {
    onStatus('Optimizing image…')
    try {
      return await compressImage(file)
    } catch {
      return file
    }
  }
  if (file.type === 'application/pdf') {
    onStatus('Optimizing PDF…')
    return compressPdf(file)
  }
  // .docx/.xlsx/.pptx/.txt/.gif — no client compression
  return file
}

// ── Helpers ───────────────────────────────────────────────────

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function isBlockedExtension(name: string): boolean {
  const ext = `.${name.split('.').pop()?.toLowerCase() ?? ''}`
  return BLOCKED_EXTENSIONS.includes(ext as typeof BLOCKED_EXTENSIONS[number])
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

  const [file, setFile]               = useState<File | null>(null)
  const [originalSize, setOriginalSize] = useState<number | null>(null)
  const [fileError, setFileError]     = useState('')
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null)
  const [compressedSize, setCompressedSize]       = useState<number | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { content_type: 'notes', is_anonymous: false, expiry_option: '30d' },
  })

  const contentType = watch('content_type')
  const isLink = contentType === 'link'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFileError('')
    setCompressedSize(null)
    setCompressionStatus(null)

    // Client-side block list check
    if (isBlockedExtension(f.name)) {
      setFileError('File type not allowed.')
      return
    }
    // Client-side MIME allowlist
    if (!ALLOWED_COMMUNITY_MIMES.includes(f.type as typeof ALLOWED_COMMUNITY_MIMES[number])) {
      setFileError('File type not allowed. (PDF, PNG, JPG, WebP, GIF, DOCX, XLSX, PPTX, TXT)')
      return
    }
    // Size cap — server is the real gate; client check is UX only
    if (f.size > MAX_COMMUNITY_FILE_SIZE) {
      setFileError(`File exceeds 10 MB limit (${fmtBytes(f.size)})`)
      return
    }

    setFile(f)
    setOriginalSize(f.size)
  }

  async function onSubmit(values: FormValues) {
    setError('')
    setSubmitting(true)

    try {
      const expires_at = expiryOptionToDate(values.expiry_option as ExpiryOption)
      let storageKey: string | undefined
      let compressedMime: string | undefined

      if (!isLink) {
        if (!file) { setError('Please select a file.'); setSubmitting(false); return }

        // 1. Compress client-side (silent, auto, no approval dialog)
        setCompressionStatus('Optimizing…')
        const compressed = await compressFile(file, setCompressionStatus)
        setCompressedSize(compressed.size)
        setCompressionStatus(null)
        compressedMime = compressed.type || file.type

        // 2. Get signed upload URL (server validates MIME + ext + size cap)
        const urlResult = await getCommunityUploadUrl({
          mime_type:  compressedMime,
          file_name:  compressed.name,
          size_bytes: compressed.size,
        })
        if (urlResult.error) { setError(urlResult.error); setSubmitting(false); return }

        // 3. PUT compressed file directly to storage
        const uploadRes = await fetch(urlResult.uploadUrl!, {
          method: 'PUT',
          body: compressed,
          headers: { 'Content-Type': compressedMime },
        })
        if (!uploadRes.ok) {
          setError('File upload failed. Try again.')
          setSubmitting(false)
          return
        }
        storageKey = urlResult.storagePath!
      }

      // 4. Create post row
      const result = await createCommunityPost({
        title:        values.title,
        subject_tag:  values.subject_tag || undefined,
        content_type: values.content_type,
        description:  values.description || undefined,
        is_anonymous: values.is_anonymous,
        expires_at,
        file_meta: !isLink && file ? {
          mime_type:  file.type,
          file_name:  file.name,
          size_bytes: file.size,
        } : undefined,
        external_url: isLink ? (values.external_url || undefined) : undefined,
      })
      if (result.error) { setError(result.error); setSubmitting(false); return }

      // 5. Verify magic bytes server-side, then link storage key to post
      if (storageKey && compressedMime && !('error' in result)) {
        const verifyResult = await verifyAndLinkCommunityFile(
          result.id,
          storageKey,
          compressedMime,
        )
        if (verifyResult.error) {
          setError(verifyResult.error)
          setSubmitting(false)
          return
        }
      }

      router.push('/community')
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

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

      {/* File or URL */}
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
        <div className="space-y-1">
          <Label>File * (PDF, PNG, JPG, WebP, GIF, DOCX, XLSX, PPTX, TXT · max 10 MB)</Label>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground
              file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
              file:text-sm file:font-medium file:bg-primary file:text-primary-foreground
              hover:file:opacity-90 cursor-pointer"
          />

          {/* File info + compression status */}
          {compressionStatus && (
            <p className="text-xs text-muted-foreground animate-pulse">{compressionStatus}</p>
          )}
          {file && !compressionStatus && (
            <p className="text-xs text-muted-foreground">
              {file.name}
              {compressedSize !== null && originalSize !== null && compressedSize < originalSize ? (
                <span>
                  {' '}· {fmtBytes(originalSize)}{' '}
                  <span className="text-green-600 dark:text-green-400">
                    → {fmtBytes(compressedSize)} saved
                  </span>
                </span>
              ) : originalSize !== null ? (
                <span> · {fmtBytes(originalSize)}</span>
              ) : null}
            </p>
          )}
          {fileError && <p className="text-sm text-red-500">{fileError}</p>}
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

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (compressionStatus ?? 'Uploading…') : 'Share with class'}
      </Button>
    </form>
  )
}
