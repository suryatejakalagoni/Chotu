'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { CONTENT_TYPES, MAX_COMMUNITY_FILE_SIZE, ALLOWED_COMMUNITY_MIMES } from '@/lib/validations/community'
import { expiryOptionToDate, contentTypeLabel, type ExpiryOption } from '@/lib/community-utils'
import { getCommunityUploadUrl, createCommunityPost, setCommunityPostStorageKey } from '@/lib/actions/community'

const formSchema = z.object({
  title:        z.string().min(1, 'Required').max(200),
  subject_tag:  z.string().max(50).optional(),
  content_type: z.enum(CONTENT_TYPES),
  description:  z.string().max(2000).optional(),
  is_anonymous: z.boolean(),
  expiry_option: z.enum(['7d', '30d', '90d', 'semester', 'never'] as const),
  external_url: z.string().url().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof formSchema>

const EXPIRY_OPTIONS: { value: ExpiryOption; label: string }[] = [
  { value: '7d',      label: '7 days' },
  { value: '30d',     label: '30 days' },
  { value: '90d',     label: '90 days' },
  { value: 'semester', label: 'End of semester' },
  { value: 'never',   label: 'Never' },
]

export function PostForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile]     = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content_type:  'notes',
      is_anonymous:  false,
      expiry_option: '30d',
    },
  })

  const contentType = watch('content_type')
  const isLink = contentType === 'link'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFileError('')
    if (f.size > MAX_COMMUNITY_FILE_SIZE) {
      setFileError('File exceeds 10 MB limit')
      return
    }
    if (!ALLOWED_COMMUNITY_MIMES.includes(f.type as typeof ALLOWED_COMMUNITY_MIMES[number])) {
      setFileError('File type not allowed (PDF, PNG, JPG, DOCX, TXT, MD only)')
      return
    }
    setFile(f)
  }

  async function onSubmit(values: FormValues) {
    setError('')
    setSubmitting(true)

    try {
      const expires_at = expiryOptionToDate(values.expiry_option as ExpiryOption)

      let storageKey: string | undefined

      if (!isLink) {
        if (!file) { setError('Please select a file.'); setSubmitting(false); return }

        // 1. Get signed upload URL
        const urlResult = await getCommunityUploadUrl({
          mime_type:  file.type,
          file_name:  file.name,
          size_bytes: file.size,
        })
        if (urlResult.error) { setError(urlResult.error); setSubmitting(false); return }

        // 2. Upload directly to Supabase Storage
        const uploadRes = await fetch(urlResult.uploadUrl!, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })
        if (!uploadRes.ok) {
          setError('File upload failed. Try again.')
          setSubmitting(false)
          return
        }
        storageKey = urlResult.storagePath!
      }

      // 3. Create post row
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

      // 4. Link storage key to post
      if (storageKey && !('error' in result)) {
        const keyResult = await setCommunityPostStorageKey(result.id, storageKey)
        if (keyResult.error) console.error('[PostForm] key link failed:', keyResult.error)
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
          <Label>File * (PDF, PNG, JPG, DOCX, TXT, MD · max 10 MB)</Label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx,.txt,.md"
            onChange={handleFileChange}
            className="block w-full text-sm text-muted-foreground
              file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0
              file:text-sm file:font-medium file:bg-primary file:text-primary-foreground
              hover:file:opacity-90 cursor-pointer"
          />
          {file && (
            <p className="text-xs text-muted-foreground">
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
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
        {submitting ? 'Uploading…' : 'Share with class'}
      </Button>
    </form>
  )
}
