'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { budgetSchema } from '@/lib/validations/expenses'
import { upsertBudget } from '@/lib/actions/expenses'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Database } from '@/types/database.types'

type Category = Pick<Database['public']['Tables']['categories']['Row'], 'id' | 'name' | 'type'>
type FormValues = z.infer<typeof budgetSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  currentMonth: string // "YYYY-MM"
}

export function BudgetForm({ open, onOpenChange, categories, currentMonth }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      name: '',
      scope: 'overall',
      category_id: null,
      amount: undefined,
      month: currentMonth,
    },
  })

  const scope = watch('scope')
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  const onSubmit = async (values: FormValues) => {
    const result = await upsertBudget(values)
    if (result.error) {
      setError('root', { message: result.error })
      return
    }
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Budget</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="budget-name">Budget Name</Label>
            <Input
              id="budget-name"
              placeholder="e.g. Monthly overall, Food limit..."
              {...register('name')}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Scope</Label>
            <Select
              value={scope}
              onValueChange={(v) => {
                setValue('scope', v as 'overall' | 'category')
                if (v === 'overall') setValue('category_id', null)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">Overall (all expenses)</SelectItem>
                <SelectItem value="category">Per category</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === 'category' && (
            <div className="space-y-1">
              <Label>Category</Label>
              <Select
                value={watch('category_id') ?? ''}
                onValueChange={(v) => setValue('category_id', v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-destructive">{errors.category_id.message}</p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="budget-amount">Amount (₹)</Label>
            <Input
              id="budget-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="budget-month">Month</Label>
            <Input id="budget-month" type="month" {...register('month')} />
            {errors.month && <p className="text-sm text-destructive">{errors.month.message}</p>}
          </div>

          {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Budget'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
