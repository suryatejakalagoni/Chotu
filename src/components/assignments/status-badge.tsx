type Status = 'not_started' | 'in_progress' | 'done'

const CONFIG: Record<Status, { label: string; cls: string }> = {
  not_started: { label: 'Not Started', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-50  text-blue-700  border-blue-200'  },
  done:        { label: 'Done',         cls: 'bg-green-50 text-green-700 border-green-200' },
}

export function StatusBadge({ status }: { status: Status }) {
  const { label, cls } = CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      {label}
    </span>
  )
}
