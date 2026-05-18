import { z } from 'zod'

export const transcriptSchema = z.object({
  transcript: z
    .string()
    .min(1, 'Nothing was captured. Please try again.')
    .max(500, 'Transcript too long (max 500 characters).')
    .trim(),
})

export const confirmVoiceSchema = z.object({
  voice_entry_id: z.string().uuid('Invalid entry ID.'),
})

export const undoVoiceSchema = z.object({
  voice_entry_id: z.string().uuid('Invalid entry ID.'),
})
