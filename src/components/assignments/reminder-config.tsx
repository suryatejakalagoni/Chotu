'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ReminderSelection, ReminderType } from '@/lib/assignment-utils'

interface Props {
  dueAt:    string
  value:    ReminderSelection[]
  onChange: (v: ReminderSelection[]) => void
}

const STANDARD: { type: ReminderType; label: string }[] = [
  { type: '1_day',      label: '1 day before'              },
  { type: '3_hours',    label: '3 hours before'            },
  { type: 'morning_of', label: 'Morning of at 8 AM (IST)' },
]

function isChecked(value: ReminderSelection[], type: ReminderType): boolean {
  return value.some((r) => r.reminder_type === type)
}

function getCustomTime(value: ReminderSelection[]): string {
  return value.find((r) => r.reminder_type === 'custom')?.custom_time?.slice(0, 16) ?? ''
}

export function ReminderConfig({ dueAt, value, onChange }: Props) {
  function toggle(type: ReminderType) {
    if (isChecked(value, type)) {
      onChange(value.filter((r) => r.reminder_type !== type))
    } else {
      onChange([...value, { reminder_type: type }])
    }
  }

  function setCustomTime(time: string) {
    const without = value.filter((r) => r.reminder_type !== 'custom')
    if (time) {
      onChange([...without, { reminder_type: 'custom', custom_time: new Date(time).toISOString() }])
    } else {
      onChange(without)
    }
  }

  const customTime = getCustomTime(value)

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Reminders</p>
      <div className="space-y-2">
        {STANDARD.map(({ type, label }) => (
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

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 accent-primary"
            checked={isChecked(value, 'custom')}
            onChange={() => toggle('custom')}
          />
          <span className="text-sm">Custom time</span>
        </label>

        {isChecked(value, 'custom') && (
          <div className="ml-6 space-y-1">
            <Label htmlFor="custom-reminder" className="text-xs">
              Remind me at
            </Label>
            <Input
              id="custom-reminder"
              type="datetime-local"
              className="w-52 h-8 text-sm"
              value={customTime}
              max={dueAt}
              onChange={(e) => setCustomTime(e.target.value)}
            />
          </div>
        )}
      </div>
      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length} reminder{value.length > 1 ? 's' : ''} set · delivery active from Day 11
        </p>
      )}
    </div>
  )
}
