'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExpenseForm } from './expense-form'
import type { Database } from '@/types/database.types'

type Category = Database['public']['Tables']['categories']['Row']

export function AddExpenseButton({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add Expense</Button>
      <ExpenseForm open={open} onOpenChange={setOpen} categories={categories} />
    </>
  )
}
