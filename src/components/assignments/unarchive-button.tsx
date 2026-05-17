'use client'

import { useState } from 'react'
import { unarchiveAssignment } from '@/lib/actions/assignments'
import { Button } from '@/components/ui/button'

export function UnarchiveButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState<string | null>(null)

  async function handleClick() {
    setBusy(true)
    const result = await unarchiveAssignment(id)
    setBusy(false)
    if (result.error) setErr(result.error)
  }

  return (
    <div className="shrink-0">
      <Button variant="ghost" size="sm" className="h-8 text-xs" disabled={busy} onClick={handleClick}>
        {busy ? '…' : 'Restore'}
      </Button>
      {err && <p className="text-xs text-destructive mt-1">{err}</p>}
    </div>
  )
}
