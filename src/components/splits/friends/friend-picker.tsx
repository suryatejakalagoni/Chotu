'use client'

interface Friend {
  id: string
  name: string
}

interface FriendPickerProps {
  friends: Friend[]
  selected: string[]
  onChange: (ids: string[]) => void
}

export function FriendPicker({ friends, selected, onChange }: FriendPickerProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  if (friends.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No friends yet. Add friends first.
      </p>
    )
  }

  return (
    <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
      {friends.map((f) => (
        <label
          key={f.id}
          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary"
            checked={selected.includes(f.id)}
            onChange={() => toggle(f.id)}
          />
          <span className="text-sm">{f.name}</span>
        </label>
      ))}
    </div>
  )
}
