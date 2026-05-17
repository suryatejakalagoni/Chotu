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

export const MAX_FILE_SIZE = 50 * 1024 * 1024
export const MAX_ATTACHMENTS_PER_EXAM = 5
export const USER_STORAGE_LIMIT = 300 * 1024 * 1024

const dateField = z
  .string()
  .min(1, 'Date is required')
  .refine((v) => !isNaN(Date.parse(v)), 'Invalid date')

export const examCreateSchema = z.object({
  subject:       z.string().min(1, 'Subject is required').max(100).trim(),
  exam_type:     z.string().max(50).trim().optional(),
  exam_at:       dateField,
  venue:         z.string().max(200).trim().optional(),
  syllabus_text: z.string().max(5000).trim().optional(),
  notes:         z.string().max(2000).trim().optional(),
  status:        z.enum(['upcoming', 'completed', 'cancelled']).default('upcoming'),
})

export const examUpdateSchema = examCreateSchema
  .partial()
  .extend({ id: z.string().uuid() })

export const examStatusSchema = z.object({
  id:     z.string().uuid(),
  status: z.enum(['upcoming', 'completed', 'cancelled']),
})

export const topicCreateSchema = z.object({
  exam_id:    z.string().uuid(),
  topic_text: z.string().min(1, 'Topic text is required').max(300).trim(),
})

export const topicToggleSchema = z.object({
  id:         z.string().uuid(),
  is_revised: z.boolean(),
})

export const examReminderSchema = z.object({
  exam_id:       z.string().uuid(),
  trigger_at:    dateField,
  reminder_type: z.enum(['1_week', '3_days', '1_day', 'morning_of', '1_hour']),
})

export const examAttachmentMetaSchema = z.object({
  exam_id:    z.string().uuid(),
  file_name:  z.string().min(1).max(255),
  size_bytes: z
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

export type ExamCreate        = z.infer<typeof examCreateSchema>
export type ExamUpdate        = z.infer<typeof examUpdateSchema>
export type TopicCreate       = z.infer<typeof topicCreateSchema>
export type TopicToggle       = z.infer<typeof topicToggleSchema>
export type ExamReminderInput = z.infer<typeof examReminderSchema>
export type ExamAttachmentMeta = z.infer<typeof examAttachmentMetaSchema>
