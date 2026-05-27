import { z } from 'zod'

export const CONTENT_TYPES = ['assignment', 'solution', 'paper', 'notes', 'syllabus', 'link'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

// ── Allowlist (MIME + extension must both match) ───────────────
export const ALLOWED_COMMUNITY_EXTENSIONS = [
  '.pdf',
  '.png', '.jpg', '.jpeg', '.webp', '.gif',
  '.docx', '.xlsx', '.pptx',
  '.txt',
] as const

export const ALLOWED_COMMUNITY_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',        // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'text/plain',
] as const

// Extensions that must be explicitly rejected even if MIME looks valid.
// Deny-by-default means anything not in ALLOWED_COMMUNITY_EXTENSIONS is already
// blocked; this list adds a hard reject for the most dangerous types.
export const BLOCKED_EXTENSIONS = [
  '.html', '.htm', '.svg', '.svgz',
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx',
  '.exe', '.dll', '.so', '.dylib',
  '.sh', '.bash', '.bat', '.cmd', '.ps1', '.vbs',
  '.py', '.rb', '.php', '.pl',
  '.jar', '.class',
] as const

// ── Magic bytes for server-side file type verification ────────
// Checked against the first 16 bytes of the uploaded object.
export const MIME_MAGIC: Record<string, { offset?: number; bytes: number[] }[]> = {
  'image/jpeg': [{ bytes: [0xFF, 0xD8, 0xFF] }],
  'image/png':  [{ bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }],
  // WebP: RIFF at 0–3, WEBP at 8–11
  'image/webp': [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],
  // GIF87a and GIF89a
  'image/gif': [
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
    { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
  ],
  'application/pdf': [{ bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  // Office Open XML formats are all ZIP (PK magic)
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':  [{ bytes: [0x50, 0x4B, 0x03, 0x04] }],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':        [{ bytes: [0x50, 0x4B, 0x03, 0x04] }],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': [{ bytes: [0x50, 0x4B, 0x03, 0x04] }],
  // text/plain: no reliable magic bytes; skip check (MIME + extension is sufficient)
  'text/plain': [],
}

/** Returns true if the first 16 bytes of a file match the expected magic bytes for mimeType. */
export function checkMagicBytes(buf: Uint8Array, mimeType: string): boolean {
  const rules = MIME_MAGIC[mimeType]
  if (rules === undefined) return false  // unknown MIME = reject
  if (rules.length === 0) return true    // text/plain — no magic bytes to check

  // WebP needs ALL rules to match (RIFF at 0 AND WEBP at 8)
  // Other types: any one rule matching is enough (GIF alternate signatures)
  const isWebp = mimeType === 'image/webp'

  if (isWebp) {
    return rules.every(rule => {
      const off = rule.offset ?? 0
      return rule.bytes.every((b, i) => buf[off + i] === b)
    })
  }

  return rules.some(rule => {
    const off = rule.offset ?? 0
    return rule.bytes.every((b, i) => buf[off + i] === b)
  })
}

export const MAX_COMMUNITY_FILE_SIZE = 10 * 1024 * 1024  // 10 MB
export const MAX_COMMUNITY_FILES_PER_USER = 100
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
