import { createClient } from '@/lib/supabase/server'
import { hasGoogleIntegration } from '@/lib/google-auth'
import { GoogleCalendarSection } from '@/components/settings/google-calendar-section'

export const metadata = { title: 'Settings — Chotu' }

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google_connected?: string; google_error?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const isConnected = await hasGoogleIntegration(user.id)

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      <GoogleCalendarSection
        isConnected={isConnected}
        successMessage={params.google_connected === '1' ? 'Google Calendar connected!' : undefined}
        errorMessage={
          params.google_error === 'state_mismatch'    ? 'Connection failed: security check failed. Please try again.' :
          params.google_error === 'token_exchange_failed' ? 'Connection failed: could not get tokens from Google. Please try again.' :
          params.google_error === 'no_refresh_token'  ? 'Connection failed: no refresh token. Try disconnecting and reconnecting.' :
          params.google_error === 'unexpected'        ? 'An unexpected error occurred. Please try again.' :
          params.google_error === 'invalid_callback'  ? 'Invalid callback. Please try connecting again.' :
          undefined
        }
      />
    </main>
  )
}
