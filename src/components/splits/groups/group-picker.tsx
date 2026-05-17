'use client'

interface Group {
  id: string
  name: string
}

interface GroupPickerProps {
  groups: Group[]
  value: string | null
  onChange: (id: string | null) => void
}

export function GroupPicker({ groups, value, onChange }: GroupPickerProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">No group (ad-hoc)</option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  )
}
