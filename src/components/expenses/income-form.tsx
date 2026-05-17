'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { incomeSchema } from '@/lib/validations/expenses'
import { addIncome } from '@/lib/actions/expenses'
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
type FormValues = z.infer<typeof incomeSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
}

function toDatetimeLocal(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16)
}

export function IncomeForm({ open, onOpenChange, categories }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      title: '',
      amount: undefined,
      source: '',
      category_id: null,
      received_at: toDatetimeLocal(new Date().toISOString()),
      notes: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    const result = await addIncome(values)
    if (result.error) {
      setError('root', { message: result.error })
      return
    }
    reset()
    onOpenChange(false)
  }

  const incomeCategories = categories.filter((c) => c.type === 'income')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Income</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="inc-title">Title</Label>
            <Input id="inc-title" placeholder="e.g. Monthly allowance" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="inc-amount">Amount (₹)</Label>
            <Input
              id="inc-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="inc-source">Source (optional)</Label>
            <Input
              id="inc-source"
              placeholder="e.g. Parents, Scholarship..."
              {...register('source')}
            />
          </div>

          <div className="space-y-1">
            <Label>Category (optional)</Label>
            <Select
              value={watch('category_id') ?? ''}
              onValueChange={(v) => setValue('category_id', v || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No category</SelectItem>
                {incomeCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="received_at">Date Received</Label>
            <Input id="received_at" type="datetime-local" {...register('received_at')} />
            {errors.received_at && (
              <p className="text-sm text-destructive">{errors.received_at.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="inc-notes">Notes (optional)</Label>
            <Textarea
              id="inc-notes"
              placeholder="Any extra details..."
              rows={2}
              {...register('notes')}
            />
          </div>

          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Log Income'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
