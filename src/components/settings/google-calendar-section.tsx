'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { disconnectGoogleCalendar } from '@/lib/actions/google-calendar'
import { cn } from '@/lib/utils'

interface Props {
  isConnected: boolean
  successMessage?: string
  errorMessage?: string
}

export function GoogleCalendarSection({ isConnected, successMessage, errorMessage }: Props) {
  const [connected, setConnected] = useState(isConnected)
  const [disconnecting, setDisconnecting] = useState(false)
  const [localError, setLocalError] = useState<string | undefined>(undefined)

  async function handleDisconnect() {
    setDisconnecting(true)
    setLocalError(undefined)
    const result = await disconnectGoogleCalendar()
    if (result.error) {
      setLocalError(result.error)
    } else {
      setConnected(false)
    }
    setDisconnecting(false)
  }

  const displayError = localError ?? errorMessage

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Google Calendar</CardTitle>
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              connected
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {connected ? 'Connected' : 'Not connected'}
          </span>
        </div>
        <CardDescription>
          When connected, Chotu will automatically add your assignment and exam reminders to Google Calendar.
          Google will then send you notifications at the right time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {successMessage && (
          <p className="text-sm text-green-600 font-medium">{successMessage}</p>
        )}
        {displayError && (
          <p className="text-sm text-destructive">{displayError}</p>
        )}

        {connected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? 'Disconnecting…' : 'Disconnect Google Calendar'}
          </Button>
        ) : (
          <a
            href="/api/google/connect"
            className={cn(buttonVariants({ size: 'sm' }), 'inline-flex')}
          >
            Connect Google Calendar
          </a>
        )}

        {!connected && (
          <p className="text-xs text-muted-foreground">
            You&apos;ll be asked to sign in with Google and grant Chotu permission to create calendar events.
            We only request access to create/update/delete events — we cannot read your existing calendar.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
