'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// Only the fields we need — allows passing a partial select from the server
interface ExpenseRow {
  spent_at: string
  amount: number
}

interface Props {
  expenses: ExpenseRow[]
}

function getLast30Days(): { date: string; label: string }[] {
  const days: { date: string; label: string }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const date = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    days.push({ date, label })
  }
  return days
}

export function DailyBarChart({ expenses }: Props) {
  const days = getLast30Days()

  const spendByDay: Record<string, number> = {}
  for (const e of expenses) {
    const day = e.spent_at.slice(0, 10)
    spendByDay[day] = (spendByDay[day] ?? 0) + e.amount
  }

  const data = days.map(({ date, label }) => ({
    label,
    amount: Math.round((spendByDay[date] ?? 0) * 100) / 100,
  }))

  const hasData = data.some((d) => d.amount > 0)

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No expenses in the last 30 days.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10 }}
          interval={4}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `₹${v}`}
          width={55}
        />
        <Tooltip
          formatter={(value) => {
            const num = typeof value === 'number' ? value : 0
            return [`₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`, 'Spent']
          }}
          labelStyle={{ fontWeight: 500 }}
        />
        <Bar dataKey="amount" fill="#6366f1" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
