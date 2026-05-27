// TODO: consolidate — 'completed'/'cancelled' are Day 7 legacy; 'ongoing'/'done'/'missed' are Phase 6 UI values
interface Props {
  status: 'upcoming' | 'ongoing' | 'done' | 'missed' | 'completed' | 'cancelled'
}

const MAP: Record<Props['status'], { label: string; className: string }> = {
  upcoming:  { label: 'Upcoming',  className: 'bg-blue-100 text-blue-800'    },
  ongoing:   { label: 'Ongoing',   className: 'bg-yellow-100 text-yellow-800' },
  done:      { label: 'Done',      className: 'bg-green-100 text-green-800'  },
  missed:    { label: 'Missed',    className: 'bg-red-100 text-red-700'      },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-800'  },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600'    },
}

export function ExamStatusBadge({ status }: Props) {
  const { label, className } = MAP[status] ?? MAP.upcoming
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
