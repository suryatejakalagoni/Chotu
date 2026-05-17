import { z } from 'zod'

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
] as const

export const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.txt', '.md']

export const MAX_FILE_SIZE = 50 * 1024 * 1024         // 50 MB per file (Supabase free tier cap)
export const MAX_ATTACHMENTS_PER_ASSIGNMENT = 5
export const USER_STORAGE_LIMIT = 300 * 1024 * 1024  // 300 MB per user

const dateField = z
  .string()
  .min(1, 'Date is required')
  .refine((v) => !isNaN(Date.parse(v)), 'Invalid date')

export const assignmentCreateSchema = z.object({
  subject:           z.string().min(1, 'Subject is required').max(100).trim(),
  title:             z.string().min(1, 'Title is required').max(200).trim(),
  description:       z.string().max(2000).trim().optional(),
  due_at:            dateField,
  estimated_minutes: z.number().int().positive().max(10000).optional(),
  status:            z.enum(['not_started', 'in_progress', 'done']),
  priority:          z.enum(['low', 'medium', 'high']),
  notes:             z.string().max(5000).trim().optional(),
  is_recurring:      z.boolean(),
  recurrence_rule:   z.string().optional(),
}).refine(
  (d) => !d.is_recurring || !!d.recurrence_rule,
  { message: 'Recurrence rule is required when recurring', path: ['recurrence_rule'] }
)

export const assignmentUpdateSchema = assignmentCreateSchema
  .partial()
  .extend({ id: z.string().uuid() })

export const statusTransitionSchema = z.object({
  id:     z.string().uuid(),
  status: z.enum(['not_started', 'in_progress', 'done']),
})

export const reminderSchema = z.object({
  assignment_id: z.string().uuid(),
  trigger_at:    dateField,
  reminder_type: z.enum(['1_day', '3_hours', 'morning_of', 'custom']),
})

export const attachmentMetaSchema = z.object({
  assignment_id: z.string().uuid(),
  file_name:     z.string().min(1).max(255),
  size_bytes:    z
    .number()
    .int()
    .positive()
    .max(MAX_FILE_SIZE, 'File must be under 50 MB'),
  mime_type: z.enum(ALLOWED_MIME_TYPES as unknown as [string, ...string[]], {
    error: 'File type not allowed',
  }),
  extension: z
    .string()
    .refine((e) => ALLOWED_EXTENSIONS.includes(e.toLowerCase()), 'Extension not allowed'),
})

export type AssignmentCreate   = z.infer<typeof assignmentCreateSchema>
export type AssignmentUpdate   = z.infer<typeof assignmentUpdateSchema>
export type StatusTransition   = z.infer<typeof statusTransitionSchema>
export type ReminderInput      = z.infer<typeof reminderSchema>
export type AttachmentMeta     = z.infer<typeof attachmentMetaSchema>
