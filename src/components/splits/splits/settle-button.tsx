'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { settleShare, unsettleShare } from '@/lib/actions/splits'

interface SettleButtonProps {
  shareId: string
  isSettled: boolean
  friendName: string
}

export function SettleButton({ shareId, isSettled, friendName }: SettleButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setLoading(true)
    setError(null)
    const result = isSettled
      ? await unsettleShare(shareId)
      : await settleShare(shareId)
    setLoading(false)
    if (result.error) setError(result.error)
  }

  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <Button
        variant={isSettled ? 'outline' : 'default'}
        size="sm"
        className={`h-7 text-xs ${isSettled ? 'text-green-600 border-green-300 hover:bg-green-50' : ''}`}
        onClick={handleClick}
        disabled={loading}
        aria-label={isSettled ? `Unsettle ${friendName}'s share` : `Mark ${friendName}'s share as settled`}
      >
        {loading ? '…' : isSettled ? '✓ Settled' : 'Mark settled'}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
