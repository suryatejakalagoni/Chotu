import { z } from 'zod'

export const CONTENT_TYPES = ['assignment', 'solution', 'paper', 'notes', 'syllabus', 'link'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

export const ALLOWED_COMMUNITY_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.txt', '.md'] as const
export const ALLOWED_COMMUNITY_MIMES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
] as const

export const MAX_COMMUNITY_FILE_SIZE = 10 * 1024 * 1024  // 10 MB
export const MAX_COMMUNITY_FILES_PER_USER = 100           // soft cap
export const COMMUNITY_STORAGE_LIMIT = 1024 * 1024 * 1024 // 1 GB bucket total

// ── Post upload / create ──────────────────────────────────────
export const postSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Max 200 characters'),
    subject_tag: z.string().max(50, 'Max 50 characters').optional(),
    content_type: z.enum(CONTENT_TYPES, { message: 'Invalid content type' }),
    description: z.string().max(2000, 'Max 2000 characters').optional(),
    is_anonymous: z.boolean().default(false),
    expires_at: z
      .string()
      .datetime({ message: 'Invalid date' })
      .refine((v) => new Date(v) > new Date(), { message: 'Expiry must be in the future' })
      .nullable()
      .optional(),
    // Only one of file_meta or external_url must be present
    file_meta: z
      .object({
        mime_type: z.string(),
        file_name: z.string(),
        size_bytes: z.number().max(MAX_COMMUNITY_FILE_SIZE, 'Max 10 MB per file'),
      })
      .optional(),
    external_url: z
      .string()
      .url('Must be a valid URL')
      .max(500, 'Max 500 characters')
      .refine(
        (v) => /^https?:\/\//i.test(v),
        { message: 'Only http/https URLs are allowed' }
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.content_type === 'link') {
      if (!data.external_url) {
        ctx.addIssue({ code: 'custom', path: ['external_url'], message: 'URL is required for link posts' })
      }
    } else {
      if (!data.file_meta) {
        ctx.addIssue({ code: 'custom', path: ['file_meta'], message: 'File is required for this content type' })
      }
    }
  })

export type PostInput = z.infer<typeof postSchema>

// Schema for the attachment upload URL request
export const communityFileMeta = z.object({
  mime_type: z.enum(ALLOWED_COMMUNITY_MIMES as unknown as [string, ...string[]], { message: 'File type not allowed' }),
  file_name: z.string().min(1),
  size_bytes: z.number().max(MAX_COMMUNITY_FILE_SIZE, 'Max 10 MB'),
})

// ── Vote ──────────────────────────────────────────────────────
export const voteSchema = z.object({
  post_id: z.string().uuid(),
  value: z.union([z.literal(1), z.literal(-1)]),
})

export type VoteInput = z.infer<typeof voteSchema>

// ── Comment ───────────────────────────────────────────────────
export const commentSchema = z.object({
  post_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  content: z.string().min(1, 'Comment cannot be empty').max(1000, 'Max 1000 characters'),
})

export const commentUpdateSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(1000),
})

export type CommentInput = z.infer<typeof commentSchema>

// ── Report ────────────────────────────────────────────────────
export const reportSchema = z.object({
  target_type: z.enum(['post', 'comment']),
  target_id: z.string().uuid(),
  reason: z.string().min(1, 'Reason is required').max(500, 'Max 500 characters'),
})

export type ReportInput = z.infer<typeof reportSchema>

// ── Feed query params ─────────────────────────────────────────
export const feedParamsSchema = z.object({
  sort: z.enum(['newest', 'top', 'downloads', 'popular']).default('newest'),
  content_type: z.enum(CONTENT_TYPES).optional(),
  subject_tag: z.string().max(50).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
})

export type FeedParams = z.infer<typeof feedParamsSchema>

export const PAGE_SIZE = 20
