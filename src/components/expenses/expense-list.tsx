'use client'

import { useState } from 'react'
import DOMPurify from 'dompurify'
import { deleteExpense } from '@/lib/actions/expenses'
import { ExpenseForm } from './expense-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Database } from '@/types/database.types'

type Expense = Database['public']['Tables']['expenses']['Row']
type Category = Database['public']['Tables']['categories']['Row']

interface Props {
  expenses: Expense[]
  categories: Category[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function ExpenseList({ expenses, categories }: Props) {
  const [editTarget, setEditTarget] = useState<Expense | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    setDeletingId(id)
    setDeleteError(null)
    const result = await deleteExpense(id)
    if (result.error) setDeleteError(result.error)
    setDeletingId(null)
  }

  const handleEdit = (expense: Expense) => {
    setEditTarget(expense)
    setFormOpen(true)
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No expenses yet.</p>
        <p className="text-sm mt-1">Hit &quot;Add Expense&quot; to start tracking.</p>
      </div>
    )
  }

  return (
    <>
      {deleteError && (
        <p className="mb-3 text-sm text-destructive">{deleteError}</p>
      )}

      <div className="space-y-2">
        {expenses.map((expense) => {
          const cat = expense.category_id ? categoryMap[expense.category_id] : null
          // sanitize user-supplied text before display
          const safeNotes = expense.notes
            ? DOMPurify.sanitize(expense.notes)
            : null

          return (
            <Card key={expense.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{expense.title}</span>
                      {cat && (
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted"
                        >
                          {cat.color && (
                            <span
                              className="inline-block w-2 h-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                          )}
                          {cat.name}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                      <span>{formatDate(expense.spent_at)}</span>
                      <span className="capitalize">{expense.payment_method}</span>
                    </div>
                    {safeNotes && (
                      <p
                        className="text-sm text-muted-foreground mt-1 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: safeNotes }}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-destructive">
                      {formatAmount(expense.amount)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(expense)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      disabled={deletingId === expense.id}
                      onClick={() => handleDelete(expense.id)}
                    >
                      {deletingId === expense.id ? '...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <ExpenseForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditTarget(null)
        }}
        categories={categories}
        expense={editTarget}
      />
    </>
  )
}
