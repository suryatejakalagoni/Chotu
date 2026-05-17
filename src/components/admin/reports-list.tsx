import type { ReportWithTarget } from '@/types/community'
import { ReportItem } from './report-item'

interface ReportsListProps {
  reports: ReportWithTarget[]
}

export function ReportsList({ reports }: ReportsListProps) {
  if (reports.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-4xl mb-3">✅</p>
        <p className="font-medium">No pending reports</p>
        <p className="text-sm mt-1">The community is behaving!</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <ReportItem key={r.id} report={r} />
      ))}
    </div>
  )
}
