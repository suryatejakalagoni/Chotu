import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { resendVerification } from '@/lib/actions/auth'

export const metadata: Metadata = { title: 'Verify email — CHOTU' }

export default async function VerifyEmailPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="text-center space-y-4">
      {/* Icon */}
      <div
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: '#2C3531' }}
      >
        <svg
          className="h-6 w-6"
          style={{ color: '#F5A623' }}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
          />
        </svg>
      </div>

      <h2 className="text-xl font-semibold" style={{ color: '#F5F5F0' }}>
        Check your inbox
      </h2>

      <p className="text-sm" style={{ color: '#9ca3af' }}>
        We sent a confirmation link to{' '}
        <span className="font-medium" style={{ color: '#F5F5F0' }}>
          {user?.email ?? 'your email'}
        </span>
        . Click it to activate your account.
      </p>

      <p className="text-xs" style={{ color: '#6b7280' }}>
        Didn&apos;t get it? Check your spam folder.
      </p>

      {user && (
        <form action={resendVerification}>
          <button
            type="submit"
            className="text-sm font-medium hover:underline"
            style={{ color: '#F5A623' }}
          >
            Resend confirmation email
          </button>
        </form>
      )}

      <div className="pt-2">
        <a
          href="/login"
          className="text-sm transition-colors hover:underline"
          style={{ color: '#6b7280' }}
        >
          Back to log in
        </a>
      </div>
    </div>
  )
}
