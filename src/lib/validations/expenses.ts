import { z } from 'zod'

const round2dp = (val: number) => Math.round(val * 100) / 100

export const PAYMENT_METHODS = ['cash', 'upi', 'card', 'netbanking', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

// Dates come in as strings from datetime-local inputs; actions convert to Date.
const amountField = z
  .number()
  .positive('Amount must be greater than 0')
  .max(1_000_000, 'Amount cannot exceed ₹10,00,000')
  .transform(round2dp)

const dateStringField = z
  .string()
  .min(1, 'Date is required')
  .refine((v) => !isNaN(Date.parse(v)), 'Invalid date')

export const expenseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  amount: amountField,
  category_id: z.string().uuid('Invalid category').nullable().optional(),
  spent_at: dateStringField,
  payment_method: z.enum(PAYMENT_METHODS),
  notes: z.string().max(500, 'Max 500 characters').trim().optional(),
})

export const incomeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).trim(),
  amount: amountField,
  source: z.string().max(200).trim().optional(),
  category_id: z.string().uuid('Invalid category').nullable().optional(),
  received_at: dateStringField,
  notes: z.string().max(500).trim().optional(),
})

export const categorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(50).trim(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color like #e63946'),
  type: z.enum(['expense', 'income']),
})

// "YYYY-MM" string — actions derive starts_at/ends_at from it.
export const budgetSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100).trim(),
    scope: z.enum(['overall', 'category']),
    category_id: z.string().uuid().nullable(),
    amount: amountField,
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format'),
  })
  .refine((d) => !(d.scope === 'category' && !d.category_id), {
    message: 'Select a category for this budget',
    path: ['category_id'],
  })
  .refine((d) => !(d.scope === 'overall' && d.category_id !== null), {
    message: 'Overall budget must not have a category',
    path: ['category_id'],
  })

export type ExpenseInput = z.infer<typeof expenseSchema>
export type IncomeInput = z.infer<typeof incomeSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type BudgetInput = z.infer<typeof budgetSchema>
