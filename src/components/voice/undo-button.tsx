'use client'

import { useTransition, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useVoiceStore } from '@/store/voice-store'
import { undoVoiceEntry } from '@/lib/actions/voice'

export function UndoButton() {
  const { lastConfirmedEntryId, setLastConfirmedEntryId } = useVoiceStore()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  if (!lastConfirmedEntryId) return null

  const handleUndo = () => {
    if (isPending) return

    startTransition(async () => {
      const result = await undoVoiceEntry(lastConfirmedEntryId)
      if (result.error) {
        setMessage(result.error)
        setTimeout(() => setMessage(null), 4000)
        return
      }
      setLastConfirmedEntryId(null)
      setMessage('Last entry undone')
      setTimeout(() => setMessage(null), 3000)
    })
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      {message && (
        <span className="text-xs text-muted-foreground">{message}</span>
      )}
      <button
        onClick={handleUndo}
        disabled={isPending}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        aria-label="Undo last voice entry"
      >
        <RotateCcw size={12} />
        <span>{isPending ? 'Undoing…' : 'Undo last'}</span>
      </button>
    </div>
  )
}
