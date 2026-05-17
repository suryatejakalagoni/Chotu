'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { expenseSchema, PAYMENT_METHODS } from '@/lib/validations/expenses'
import { addExpense, updateExpense } from '@/lib/actions/expenses'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Database } from '@/types/database.types'

type Category = Database['public']['Tables']['categories']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']
type FormValues = z.infer<typeof expenseSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  expense?: Expense | null
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  netbanking: 'Net Banking',
  other: 'Other',
}

function toDatetimeLocal(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16)
}

export function ExpenseForm({ open, onOpenChange, categories, expense }: Props) {
  const isEdit = !!expense

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      title: '',
      amount: undefined,
      category_id: null,
      spent_at: toDatetimeLocal(new Date().toISOString()),
      payment_method: 'upi',
      notes: '',
    },
  })

  useEffect(() => {
    if (expense) {
      reset({
        title: expense.title,
        amount: expense.amount,
        category_id: expense.category_id ?? null,
        spent_at: toDatetimeLocal(expense.spent_at),
        payment_method: expense.payment_method as FormValues['payment_method'],
        notes: expense.notes ?? '',
      })
    } else {
      reset({
        title: '',
        amount: undefined,
        category_id: null,
        spent_at: toDatetimeLocal(new Date().toISOString()),
        payment_method: 'upi',
        notes: '',
      })
    }
  }, [expense, open, reset])

  const onSubmit = async (values: FormValues) => {
    const result = isEdit
      ? await updateExpense(expense!.id, values)
      : await addExpense(values)

    if (result.error) {
      setError('root', { message: result.error })
      return
    }
    onOpenChange(false)
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="title">What did you spend on?</Label>
            <Input id="title" placeholder="e.g. Lunch at canteen" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label>Category</Label>
            <Select
              value={watch('category_id') ?? ''}
              onValueChange={(v) => setValue('category_id', v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No category</SelectItem>
                {expenseCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      {c.color && (
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                      )}
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label htmlFor="spent_at">Date & Time</Label>
            <Input id="spent_at" type="datetime-local" {...register('spent_at')} />
            {errors.spent_at && (
              <p className="text-sm text-destructive">{errors.spent_at.message}</p>
            )}
          </div>

          {/* Payment method */}
          <div className="space-y-1">
            <Label>Payment Method</Label>
            <Select
              value={watch('payment_method')}
              onValueChange={(v) => setValue('payment_method', v as FormValues['payment_method'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {PAYMENT_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any extra details..."
              rows={2}
              {...register('notes')}
            />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
