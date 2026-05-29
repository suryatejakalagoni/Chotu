'use client'

import { useState, useEffect, useRef, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { logIn, signInWithGoogle } from '@/lib/actions/auth'
import { type LoginFormState } from '@/lib/validations/auth'
import { useOwlState } from '@/components/auth/OwlContext'
import { GalaxyButton } from '@/components/auth/GalaxyButton'
import { GalaxyWipe } from '@/components/auth/GalaxyWipe'

const inputClass =
  'block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors'

const inputStyle: React.CSSProperties = {
  background: '#eceef1',
  borderColor: 'rgba(0,0,0,0.2)',
  color: '#16181d',
}

const inputFocusStyle = { '--tw-ring-color': '#16181d' } as React.CSSProperties

function EyeOpen() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeClosed() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginFormState, FormData>(logIn, undefined)
  const { setOwlState } = useOwlState()
  const [identifier, setIdentifier] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [eyeKey, setEyeKey]             = useState(0)
  const router                          = useRouter()
  const [authError, setAuthError]       = useState<string | null>(null)

  const btnWrapperRef = useRef<HTMLDivElement>(null)
  const [wipeActive, setWipeActive] = useState(false)
  const [wipeOrigin, setWipeOrigin] = useState({ x: 0, y: 0 })
  const wipeArmedRef = useRef(false)

  // Detect phone: no @, all digits (possibly with +/spaces), at least 3 digits typed
  const digits  = identifier.replace(/\D/g, '')
  const isPhone = identifier.length > 0 && !identifier.includes('@') && /^\+?\d[\d\s]*$/.test(identifier)

  useEffect(() => { setAuthError(state?.message ?? null) }, [state])

  useEffect(() => {
    if (!state?.success || wipeArmedRef.current) return
    wipeArmedRef.current = true
    const rect = btnWrapperRef.current?.getBoundingClientRect()
    setWipeOrigin({
      x: rect && rect.width  > 0 ? rect.left + rect.width  / 2 : window.innerWidth  / 2,
      y: rect && rect.height > 0 ? rect.top  + rect.height / 2 : window.innerHeight / 2,
    })
    setWipeActive(true)
  }, [state])

  const togglePassword = () => {
    setShowPassword(v => !v)
    setEyeKey(k => k + 1)
  }

  return (
    <div className="space-y-6">
      <form
        action={action}
        onSubmit={() => { setAuthError(null); wipeArmedRef.current = false }}
        className="space-y-4"
      >
        {/* Single adaptive identifier input */}
        <div>
          <label
            htmlFor="identifier"
            className="block text-xs font-medium uppercase tracking-widest mb-1"
            style={{ color: 'rgba(22,24,29,0.65)' }}
          >
            Email or mobile number
          </label>

          {isPhone ? (
            /* Phone mode — show +91 prefix */
            <div className="flex mt-1">
              <span
                style={{
                  display: 'flex', alignItems: 'center', padding: '0 0.75rem',
                  background: '#dde0e5', borderRadius: '0.5rem 0 0 0.5rem',
                  border: '1px solid rgba(0,0,0,0.2)', borderRight: 'none',
                  fontSize: '0.875rem', color: 'rgba(22,24,29,0.7)',
                  flexShrink: 0, userSelect: 'none',
                }}
              >
                +91
              </span>
              <input
                id="identifier"
                name="identifier"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
                required
                value={digits.slice(-10)}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="9876543210"
                className="block w-full rounded-l-none rounded-r-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors"
                style={{ ...inputStyle, ...inputFocusStyle, borderLeft: 'none' }}
                onFocus={() => setOwlState('watching')}
                onBlur={() => setOwlState('idle')}
              />
            </div>
          ) : (
            /* Email mode */
            <input
              id="identifier"
              name="identifier"
              type="email"
              autoComplete="email"
              required
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="you@college.edu"
              className={`mt-1 ${inputClass}`}
              style={{ ...inputStyle, ...inputFocusStyle }}
              onFocus={() => setOwlState('watching')}
              onBlur={() => setOwlState('idle')}
            />
          )}

          {state?.errors?.identifier?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
          ))}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="password"
              className="block text-xs font-medium uppercase tracking-widest"
              style={{ color: 'rgba(22,24,29,0.65)' }}
            >
              Password
            </label>
            <a
              href="/forgot-password"
              className="text-xs hover:underline"
              style={{ color: 'rgba(22,24,29,0.55)' }}
            >
              Forgot password?
            </a>
          </div>
          <div className="relative mt-1">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className={`${inputClass} pr-10`}
              style={{ ...inputStyle, ...inputFocusStyle }}
              onFocus={() => setOwlState('covering')}
              onBlur={() => setOwlState('idle')}
            />
            <button
              type="button"
              onClick={togglePassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-opacity hover:opacity-70 focus:outline-none"
              style={{ color: 'rgba(22,24,29,0.45)' }}
            >
              <span key={eyeKey} className="eye-slice-in block">
                {showPassword ? <EyeOpen /> : <EyeClosed />}
              </span>
            </button>
          </div>
          {state?.errors?.password?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
          ))}
        </div>

        <div ref={btnWrapperRef}>
          <GalaxyButton pending={pending} label="Sign in" pendingLabel="Signing in…" />
        </div>

        {authError && (
          <p role="alert" className="mt-2 text-sm" style={{ color: '#dc2626' }}>
            {authError}
          </p>
        )}
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ borderTop: '1px solid rgba(0,0,0,0.1)' }} />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 text-xs" style={{ background: '#fff', color: 'rgba(22,24,29,0.45)' }}>
            or
          </span>
        </div>
      </div>

      {/* Google */}
      <form action={signInWithGoogle}>
        <button
          type="submit"
          className="w-full rounded-lg border py-2.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ borderColor: 'rgba(0,0,0,0.2)', color: '#16181d', background: 'transparent' }}
        >
          Continue with Google
        </button>
      </form>

      <p className="text-center text-sm" style={{ color: 'rgba(22,24,29,0.65)' }}>
        Don&apos;t have an account?{' '}
        <a href="/signup" className="font-semibold hover:underline" style={{ color: '#16181d' }}>
          Sign up
        </a>
      </p>

      <GalaxyWipe
        active={wipeActive}
        originX={wipeOrigin.x}
        originY={wipeOrigin.y}
        onComplete={() => router.push('/dashboard')}
      />
    </div>
  )
}
