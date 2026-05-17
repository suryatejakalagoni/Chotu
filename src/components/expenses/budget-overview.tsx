'use client'

import { useState } from 'react'
import { deleteBudget } from '@/lib/actions/expenses'
import { BudgetForm } from './budget-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Database } from '@/types/database.types'

type Budget = Database['public']['Tables']['budgets']['Row']
type Expense = Database['public']['Tables']['expenses']['Row']
type Income = Database['public']['Tables']['income']['Row']
type Category = Database['public']['Tables']['categories']['Row']

interface Props {
  budgets: Budget[]
  expenses: Expense[]
  incomes: Income[]
  categories: Category[]
  currentMonth: string // "YYYY-MM"
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function ProgressBar({ spent, budget }: { spent: number; budget: number }) {
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const color =
    pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{formatAmount(spent)} spent</span>
        <span>{formatAmount(budget)} limit</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {pct >= 100
          ? `Over budget by ${formatAmount(spent - budget)}`
          : `${formatAmount(budget - spent)} remaining`}
      </p>
    </div>
  )
}

export function BudgetOverview({ budgets, expenses, incomes, categories, currentMonth }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0)
  const balance = totalIncome - totalExpenses

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  const overallBudget = budgets.find((b) => b.category_id === null)
  const categoryBudgets = budgets.filter((b) => b.category_id !== null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return
    setDeletingId(id)
    setError(null)
    const result = await deleteBudget(id)
    if (result.error) setError(result.error)
    setDeletingId(null)
  }

  // Spend per category for this month
  const spendByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    if (e.category_id) {
      acc[e.category_id] = (acc[e.category_id] ?? 0) + e.amount
    }
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Balance summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Income</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatAmount(totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Spent</p>
            <p className="text-lg font-bold text-destructive">
              {formatAmount(totalExpenses)}
            </p>
          </CardContent>
        </Card>
        <Card className={balance >= 0 ? 'border-green-200' : 'border-destructive/50'}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className={`text-lg font-bold ${balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
              {formatAmount(balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add budget button */}
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-lg">Budgets</h2>
        <Button size="sm" onClick={() => setFormOpen(true)}>+ Set Budget</Button>
      </div>

      {budgets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No budgets set for this month. Add one to start tracking limits.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Overall budget */}
          {overallBudget && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{overallBudget.name}</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive h-7 px-2"
                    disabled={deletingId === overallBudget.id}
                    onClick={() => handleDelete(overallBudget.id)}
                  >
                    {deletingId === overallBudget.id ? '...' : 'Remove'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ProgressBar spent={totalExpenses} budget={overallBudget.amount} />
              </CardContent>
            </Card>
          )}

          {/* Per-category budgets */}
          {categoryBudgets.map((budget) => {
            const cat = budget.category_id ? categoryMap[budget.category_id] : null
            const spent = budget.category_id ? (spendByCategory[budget.category_id] ?? 0) : 0
            return (
              <Card key={budget.id}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {cat?.color && (
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                      )}
                      <CardTitle className="text-sm font-medium">{budget.name}</CardTitle>
                      {cat && (
                        <span className="text-xs text-muted-foreground">({cat.name})</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive h-7 px-2"
                      disabled={deletingId === budget.id}
                      onClick={() => handleDelete(budget.id)}
                    >
                      {deletingId === budget.id ? '...' : 'Remove'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ProgressBar spent={spent} budget={budget.amount} />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <BudgetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        categories={categories}
        currentMonth={currentMonth}
      />
    </div>
  )
}
