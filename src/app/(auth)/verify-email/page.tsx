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
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
        <svg
          className="h-6 w-6 text-blue-600"
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

      <h2 className="text-xl font-semibold text-gray-900">Check your inbox</h2>

      <p className="text-sm text-gray-500">
        We sent a confirmation link to{' '}
        <span className="font-medium text-gray-700">
          {user?.email ?? 'your email'}
        </span>
        . Click it to activate your account.
      </p>

      <p className="text-xs text-gray-400">
        Didn&apos;t get it? Check your spam folder.
      </p>

      {user && (
        <form action={resendVerification}>
          <button
            type="submit"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Resend confirmation email
          </button>
        </form>
      )}

      <div className="pt-2">
        <a
          href="/login"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Back to log in
        </a>
      </div>
    </div>
  )
}
