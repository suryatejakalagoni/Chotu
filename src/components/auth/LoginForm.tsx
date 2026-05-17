'use client'

import { useActionState } from 'react'
import { logIn, signInWithGoogle } from '@/lib/actions/auth'
import { type LoginFormState } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'

const inputClass =
  'mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors'
const inputStyle = {
  background: '#0F0F0F',
  borderColor: '#2a2a2a',
  color: '#F5F5F0',
}
const inputFocusStyle = { '--tw-ring-color': '#F5A623' } as React.CSSProperties

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginFormState, FormData>(
    logIn,
    undefined
  )

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        {state?.message && (
          <div
            className="rounded-lg px-3 py-2.5 text-sm"
            style={{ background: '#2a0a0a', color: '#f87171', border: '1px solid #3f1010' }}
          >
            {state.message}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            style={{ ...inputStyle, ...inputFocusStyle }}
          />
          {state?.errors?.email?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#f87171' }}>{e}</p>
          ))}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
            style={{ ...inputStyle, ...inputFocusStyle }}
          />
          {state?.errors?.password?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#f87171' }}>{e}</p>
          ))}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg py-2.5 text-sm font-bold tracking-wide transition-opacity disabled:opacity-60"
          style={{ background: '#F5A623', color: '#0F0F0F' }}
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ borderTop: '1px solid #2a2a2a' }} />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 text-xs" style={{ background: '#161616', color: '#6b7280' }}>or</span>
        </div>
      </div>

      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="w-full rounded-lg border py-2.5 text-sm font-medium transition-colors hover:opacity-80"
          style={{ borderColor: '#2a2a2a', color: '#F5F5F0', background: 'transparent' }}
        >
          Continue with Google
        </button>
      </form>

      <p className="text-center text-sm" style={{ color: '#6b7280' }}>
        Don&apos;t have an account?{' '}
        <a href="/signup" className="font-medium hover:underline" style={{ color: '#F5A623' }}>
          Sign up
        </a>
      </p>
    </div>
  )
}
