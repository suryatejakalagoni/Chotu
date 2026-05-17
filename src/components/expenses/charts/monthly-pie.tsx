'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { Database } from '@/types/database.types'

type Expense = Database['public']['Tables']['expenses']['Row']
type Category = Database['public']['Tables']['categories']['Row']

interface Props {
  expenses: Expense[]
  categories: Category[]
}

const FALLBACK_COLORS = [
  '#6366f1', '#f97316', '#22c55e', '#ef4444',
  '#06b6d4', '#a855f7', '#eab308', '#ec4899',
  '#64748b', '#10b981',
]

export function MonthlyPieChart({ expenses, categories }: Props) {
  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c]))

  const spendMap: Record<string, { name: string; value: number; color: string }> = {}

  for (const e of expenses) {
    const key = e.category_id ?? '__none__'
    const cat = e.category_id ? categoryMap[e.category_id] : null
    const name = cat?.name ?? 'Uncategorised'
    const color = cat?.color ?? '#94a3b8'

    if (!spendMap[key]) {
      spendMap[key] = { name, value: 0, color }
    }
    spendMap[key].value += e.amount
  }

  const data = Object.values(spendMap)
    .sort((a, b) => b.value - a.value)
    .map((item, i) => ({
      ...item,
      color: item.color !== '#94a3b8' ? item.color : FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      value: Math.round(item.value * 100) / 100,
    }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No expenses this month yet.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => {
            const num = typeof value === 'number' ? value : 0
            return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-sm">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
