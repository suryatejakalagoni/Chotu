'use client'

import { useActionState } from 'react'
import { signUp, signInWithGoogle } from '@/lib/actions/auth'
import { type SignupFormState } from '@/lib/validations/auth'
import { useOwlState } from '@/components/auth/OwlContext'

// ── Warm-palette input styles (landing colours only — no new hex values) ──
const inputClass =
  'mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors'

// #eceef1 = landing gradient end-stop; rgba(0,0,0,.2) = landing outline-button border
const inputStyle: React.CSSProperties = {
  background: '#eceef1',
  borderColor: 'rgba(0,0,0,0.2)',
  color: '#16181d',
}

const inputFocusStyle = { '--tw-ring-color': '#16181d' } as React.CSSProperties

export default function SignupForm() {
  const [state, action, pending] = useActionState<SignupFormState, FormData>(
    signUp,
    undefined
  )
  const { setOwlState } = useOwlState()

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">

        {/* Error banner */}
        {state?.message && (
          <div
            className="rounded-lg px-3 py-2.5 text-sm"
            style={{
              background: 'rgba(220,38,38,0.06)',
              color: '#dc2626',
              border: '1px solid rgba(220,38,38,0.18)',
            }}
          >
            {state.message}
          </div>
        )}

        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="block text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: 'rgba(22,24,29,0.65)' }}
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            className={inputClass}
            style={{ ...inputStyle, ...inputFocusStyle }}
            onFocus={() => setOwlState('watching')}
            onBlur={() => setOwlState('idle')}
          />
          {state?.errors?.username?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
          ))}
        </div>

        {/* Display Name */}
        <div>
          <label
            htmlFor="display_name"
            className="block text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: 'rgba(22,24,29,0.65)' }}
          >
            Display Name
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            required
            className={inputClass}
            style={{ ...inputStyle, ...inputFocusStyle }}
            onFocus={() => setOwlState('watching')}
            onBlur={() => setOwlState('idle')}
          />
          {state?.errors?.display_name?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
          ))}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: 'rgba(22,24,29,0.65)' }}
          >
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
            onFocus={() => setOwlState('watching')}
            onBlur={() => setOwlState('idle')}
          />
          {state?.errors?.email?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
          ))}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: 'rgba(22,24,29,0.65)' }}
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
            style={{ ...inputStyle, ...inputFocusStyle }}
            onFocus={() => setOwlState('covering')}
            onBlur={() => setOwlState('idle')}
          />
          {state?.errors?.password?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
          ))}
        </div>

        {/* Primary CTA — matches landing's "Get started" pill exactly */}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg py-2.5 text-sm font-bold tracking-wide transition-opacity disabled:opacity-60"
          style={{ background: '#1a1a1a', color: '#fff' }}
        >
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ borderTop: '1px solid rgba(0,0,0,0.1)' }} />
        </div>
        <div className="relative flex justify-center text-xs">
          {/* span bg matches the frosted card (~white) to visually break the rule */}
          <span
            className="px-3 text-xs"
            style={{ background: '#fff', color: 'rgba(22,24,29,0.45)' }}
          >
            or
          </span>
        </div>
      </div>

      {/* Google sign-in */}
      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="w-full rounded-lg border py-2.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{
            borderColor: 'rgba(0,0,0,0.2)',
            color: '#16181d',
            background: 'transparent',
          }}
        >
          Continue with Google
        </button>
      </form>

      {/* Footer link */}
      <p className="text-center text-sm" style={{ color: 'rgba(22,24,29,0.65)' }}>
        Already have an account?{' '}
        <a
          href="/login"
          className="font-semibold hover:underline"
          style={{ color: '#16181d' }}
        >
          Log in
        </a>
      </p>
    </div>
  )
}
