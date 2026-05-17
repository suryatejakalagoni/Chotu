'use client'

import type { ExamReminderSelection, ExamReminderType } from '@/lib/exam-utils'

interface Props {
  examAt:   string
  value:    ExamReminderSelection[]
  onChange: (v: ExamReminderSelection[]) => void
}

const OPTIONS: { type: ExamReminderType; label: string }[] = [
  { type: '1_week',     label: '1 week before'             },
  { type: '3_days',     label: '3 days before'             },
  { type: '1_day',      label: '1 day before'              },
  { type: 'morning_of', label: 'Morning of at 8 AM (IST)'  },
  { type: '1_hour',     label: '1 hour before'             },
]

function isChecked(value: ExamReminderSelection[], type: ExamReminderType): boolean {
  return value.some((r) => r.reminder_type === type)
}

export function ExamReminderConfig({ examAt: _examAt, value, onChange }: Props) {
  function toggle(type: ExamReminderType) {
    if (isChecked(value, type)) {
      onChange(value.filter((r) => r.reminder_type !== type))
    } else {
      onChange([...value, { reminder_type: type }])
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Reminders</p>
      <div className="space-y-2">
        {OPTIONS.map(({ type, label }) => (
          <label key={type} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 accent-primary"
              checked={isChecked(value, type)}
              onChange={() => toggle(type)}
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} reminder{value.length > 1 ? 's' : ''} set · delivery active from Day 11
        </p>
      )}
    </div>
  )
}
