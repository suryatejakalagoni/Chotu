import { z } from 'zod'

export const friendSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  email: z
    .string()
    .email('Invalid email')
    .max(200)
    .trim()
    .optional()
    .or(z.literal('')),
})

export const groupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').trim(),
  description: z.string().max(200).trim().optional(),
})

export const splitSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200).trim(),
    description: z.string().max(500).trim().optional(),
    total_amount: z
      .number()
      .positive('Amount must be positive')
      .max(1000000, 'Amount too large'),
    paid_at: z.string().datetime({ offset: true }),
    group_id: z.string().uuid().optional(),
    shares: z
      .array(
        z.object({
          friend_id: z.string().uuid(),
          amount_owed: z.number().nonnegative().max(1000000),
        })
      )
      .min(1, 'Add at least one friend'),
  })
  .superRefine((data, ctx) => {
    const sharesSum = data.shares.reduce(
      (s, sh) => s + Math.round(sh.amount_owed * 100),
      0
    )
    const total = Math.round(data.total_amount * 100)
    if (Math.abs(sharesSum - total) > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Share amounts (₹${(sharesSum / 100).toFixed(2)}) must equal total (₹${(total / 100).toFixed(2)})`,
        path: ['shares'],
      })
    }
  })

export type FriendInput = z.infer<typeof friendSchema>
export type GroupInput = z.infer<typeof groupSchema>
export type SplitInput = z.infer<typeof splitSchema>
