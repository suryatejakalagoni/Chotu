import { createClient } from '@/lib/supabase/server'
import { hasGoogleIntegration } from '@/lib/google-auth'
import { GoogleCalendarSection } from '@/components/settings/google-calendar-section'
import { AccountSection } from '@/components/settings/account-section'

export const metadata = { title: 'Settings — Chotu' }

const VOICE_COMMANDS = [
  {
    label: 'Income',
    color: 'bg-emerald-100 text-emerald-800',
    examples: ['Received 500 from dad', 'Got 1000 as allowance', 'Earned 2000 from part-time', 'Scholarship 5000', 'Gift 300 from mom'],
  },
  {
    label: 'Expense',
    color: 'bg-green-100 text-green-800',
    examples: ['Spent 150 on lunch', 'Paid 200 for chai', 'Auto 50', 'Bought coffee for 30'],
  },
  {
    label: 'Assignment',
    color: 'bg-blue-100 text-blue-800',
    examples: ['Maths assignment due Friday', 'Physics homework due tomorrow at 5', 'Submit chemistry lab by next Monday'],
  },
  {
    label: 'Exam',
    color: 'bg-purple-100 text-purple-800',
    examples: ['Chemistry exam next Thursday at 10am', 'Physics mid-sem on December 5', 'Math viva tomorrow at 2pm'],
  },
  {
    label: 'Spending query',
    color: 'bg-cyan-100 text-cyan-800',
    examples: ['How much did I spend this week?', 'What did I spend on food this month?', 'Total spend today'],
  },
  {
    label: 'Reminder',
    color: 'bg-orange-100 text-orange-800',
    examples: ['Remind me to submit form by 6pm', 'Remind me to call dad tomorrow at 8', 'Set a reminder to pay fees next Monday'],
  },
  {
    label: 'Attendance',
    color: 'bg-yellow-100 text-yellow-800',
    examples: ['Attended physics today', 'Attended maths'],
    note: 'Saved for when the attendance tracker ships.',
  },
]

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google_connected?: string; google_error?: string }>
}) {
  const params   = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const isConnected = await hasGoogleIntegration(user.id)

  const providers: string[] = user.app_metadata?.providers ?? [user.app_metadata?.provider ?? 'email']
  const isGoogleUser = providers.includes('google') && !providers.includes('email')

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-10">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Account */}
      <AccountSection
        email={user.email ?? null}
        phone={user.phone ?? null}
        emailVerified={!!user.email_confirmed_at}
        isGoogleUser={isGoogleUser}
      />

      {/* Google Calendar */}
      <GoogleCalendarSection
        isConnected={isConnected}
        successMessage={params.google_connected === '1' ? 'Google Calendar connected!' : undefined}
        errorMessage={
          params.google_error === 'state_mismatch'         ? 'Connection failed: security check failed. Please try again.' :
          params.google_error === 'token_exchange_failed'  ? 'Connection failed: could not get tokens from Google. Please try again.' :
          params.google_error === 'no_refresh_token'       ? 'Connection failed: no refresh token. Try disconnecting and reconnecting.' :
          params.google_error === 'unexpected'             ? 'An unexpected error occurred. Please try again.' :
          params.google_error === 'invalid_callback'       ? 'Invalid callback. Please try connecting again.' :
          undefined
        }
      />

      {/* Voice commands reference */}
      <section>
        <h2 className="text-lg font-semibold mb-1">Voice commands</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Tap the mic on your dashboard and say any of these phrases. Works best on Chrome for Android.
        </p>
        <div className="space-y-5">
          {VOICE_COMMANDS.map((group) => (
            <div key={group.label}>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold mb-2 ${group.color}`}>
                {group.label}
              </span>
              <ul className="space-y-1.5">
                {group.examples.map((ex) => (
                  <li
                    key={ex}
                    className="text-sm text-foreground/80 pl-3 border-l-2 border-muted font-mono"
                  >
                    &ldquo;{ex}&rdquo;
                  </li>
                ))}
              </ul>
              {'note' in group && group.note && (
                <p className="text-xs text-muted-foreground mt-1.5 italic pl-3">{group.note}</p>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 border-t pt-3">
          Parser uses regex + keyword matching — no AI, no API costs, works offline.
          You can always edit the transcript in the confirmation modal before saving.
        </p>
      </section>
    </main>
  )
}
