'use client'

import { useState } from 'react'
import { deleteIncome } from '@/lib/actions/expenses'
import { IncomeForm } from './income-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Database } from '@/types/database.types'

type Income = Database['public']['Tables']['income']['Row']
type Category = Database['public']['Tables']['categories']['Row']

interface Props {
  incomes: Income[]
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

export function IncomeList({ incomes, categories }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Income | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this income entry?')) return
    setDeletingId(id)
    setDeleteError(null)
    const result = await deleteIncome(id)
    if (result.error) setDeleteError(result.error)
    setDeletingId(null)
  }

  const handleEdit = (inc: Income) => {
    setEditTarget(inc)
    setFormOpen(true)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Income</h1>
          {incomes.length > 0 && (
            <p className="text-muted-foreground text-sm mt-0.5">
              This month:{' '}
              {formatAmount(incomes.reduce((sum, i) => sum + i.amount, 0))}
            </p>
          )}
        </div>
        <Button onClick={() => { setEditTarget(null); setFormOpen(true) }}>+ Log Income</Button>
      </div>

      {deleteError && <p className="mb-3 text-sm text-destructive">{deleteError}</p>}

      {incomes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">No income logged yet.</p>
          <p className="text-sm mt-1">Hit &quot;Log Income&quot; to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {incomes.map((inc) => {
            const cat = inc.category_id ? categoryMap[inc.category_id] : null
            return (
              <Card key={inc.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{inc.title}</span>
                        {cat && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                            {cat.name}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                        <span>{formatDate(inc.received_at)}</span>
                        {inc.source && <span>{inc.source}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatAmount(inc.amount)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(inc)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={deletingId === inc.id}
                        onClick={() => handleDelete(inc.id)}
                      >
                        {deletingId === inc.id ? '...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <IncomeForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditTarget(null)
        }}
        categories={categories}
        income={editTarget}
      />
    </>
  )
}
