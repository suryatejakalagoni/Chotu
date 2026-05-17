interface Props {
  status: 'upcoming' | 'completed' | 'cancelled'
}

const MAP = {
  upcoming:  { label: 'Upcoming',  className: 'bg-blue-100 text-blue-800'   },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600'   },
} as const

export function ExamStatusBadge({ status }: Props) {
  const { label, className } = MAP[status] ?? MAP.upcoming
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
