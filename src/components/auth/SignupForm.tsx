'use client'

import { useState, useEffect, useRef, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp, signInWithGoogle, verifyPhoneOtp } from '@/lib/actions/auth'
import { type SignupFormState, type PhoneOtpVerifyState } from '@/lib/validations/auth'
import { useOwlState } from '@/components/auth/OwlContext'
import { GalaxyButton } from '@/components/auth/GalaxyButton'
import { GalaxyWipe } from '@/components/auth/GalaxyWipe'

const inputClass =
  'mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors'

const inputStyle: React.CSSProperties = {
  background: '#eceef1',
  borderColor: 'rgba(0,0,0,0.2)',
  color: '#16181d',
}

const inputFocusStyle = { '--tw-ring-color': '#16181d' } as React.CSSProperties

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: '0.25rem',
  color: 'rgba(22,24,29,0.65)',
}

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

export default function SignupForm() {
  const [state, action, pending] = useActionState<SignupFormState, FormData>(signUp, undefined)
  const [verifyState, verifyAction, verifyPending] = useActionState<PhoneOtpVerifyState, FormData>(verifyPhoneOtp, undefined)
  const { setOwlState } = useOwlState()
  const [showPassword, setShowPassword] = useState(false)
  const [eyeKey, setEyeKey]             = useState(0)
  const router                          = useRouter()
  const [authError, setAuthError]       = useState<string | null>(null)

  // phone-only signup OTP step
  const [phoneOtpStep, setPhoneOtpStep] = useState(false)
  const [otpPhone, setOtpPhone]         = useState('')
  const [otpValue, setOtpValue]         = useState('')
  const [otpError, setOtpError]         = useState<string | null>(null)

  const btnWrapperRef = useRef<HTMLDivElement>(null)
  const [wipeActive, setWipeActive] = useState(false)
  const [wipeOrigin, setWipeOrigin] = useState({ x: 0, y: 0 })
  const wipeArmedRef    = useRef(false)
  const pendingRedirect = useRef('/verify-email')

  const armWipe = (redirect: string) => {
    if (wipeArmedRef.current) return
    wipeArmedRef.current = true
    pendingRedirect.current = redirect
    const rect = btnWrapperRef.current?.getBoundingClientRect()
    setWipeOrigin({
      x: rect && rect.width  > 0 ? rect.left + rect.width  / 2 : window.innerWidth  / 2,
      y: rect && rect.height > 0 ? rect.top  + rect.height / 2 : window.innerHeight / 2,
    })
    setWipeActive(true)
  }

  useEffect(() => { setAuthError(state?.message ?? null) }, [state])

  useEffect(() => {
    if (!state?.success) return
    if (state.phoneOnly && state.phone) {
      // Phone-only signup — Supabase sent an OTP, show the verification step
      setOtpPhone(state.phone)
      setPhoneOtpStep(true)
    } else {
      // Email signup — go to verify-email page
      armWipe('/verify-email')
    }
  }, [state]) // eslint-disable-line

  useEffect(() => { setOtpError(verifyState?.message ?? null) }, [verifyState])
  useEffect(() => {
    if (verifyState?.success) armWipe('/dashboard')
  }, [verifyState]) // eslint-disable-line

  const togglePassword = () => {
    setShowPassword(v => !v)
    setEyeKey(k => k + 1)
  }

  // ── Phone OTP verification step (phone-only signup) ─────────────────────
  if (phoneOtpStep) {
    return (
      <div className="space-y-6">
        <p className="text-sm" style={{ color: 'rgba(22,24,29,0.65)' }}>
          We sent a 6-digit code to{' '}
          <strong style={{ color: '#16181d' }}>
            {otpPhone.replace(/^\+91/, '+91 ')}
          </strong>
          . Enter it below to verify your number.
        </p>

        <form
          action={verifyAction}
          onSubmit={() => setOtpError(null)}
          className="space-y-4"
        >
          <input type="hidden" name="phone" value={otpPhone} />
          <div>
            <label htmlFor="token" style={labelStyle}>6-digit code</label>
            <input
              id="token" name="token" type="tel"
              inputMode="numeric" maxLength={6} pattern="[0-9]{6}"
              placeholder="000000" required autoFocus
              value={otpValue}
              onChange={e => setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={inputClass}
              style={{ ...inputStyle, ...inputFocusStyle, letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.25rem' }}
              onFocus={() => setOwlState('watching')}
              onBlur={() => setOwlState('idle')}
            />
            {verifyState?.errors?.token?.map(e => (
              <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
            ))}
          </div>

          <div ref={btnWrapperRef}>
            <GalaxyButton
              pending={verifyPending}
              label="Verify & create account"
              pendingLabel="Verifying…"
            />
          </div>

          {otpError && (
            <p role="alert" className="mt-2 text-sm" style={{ color: '#dc2626' }}>{otpError}</p>
          )}
        </form>

        <button
          type="button"
          onClick={() => { setPhoneOtpStep(false); setOtpValue(''); setOtpError(null) }}
          className="w-full text-sm hover:underline"
          style={{ color: 'rgba(22,24,29,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Back to sign up
        </button>

        <GalaxyWipe
          active={wipeActive}
          originX={wipeOrigin.x}
          originY={wipeOrigin.y}
          onComplete={() => router.push(pendingRedirect.current)}
        />
      </div>
    )
  }

  // ── Main signup form ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <form
        action={action}
        onSubmit={() => { setAuthError(null); wipeArmedRef.current = false }}
        className="space-y-4"
      >

        {/* Username */}
        <div>
          <label htmlFor="username" style={labelStyle}>Username</label>
          <input
            id="username" name="username" type="text"
            autoComplete="username" required
            className={inputClass} style={{ ...inputStyle, ...inputFocusStyle }}
            onFocus={() => setOwlState('watching')}
            onBlur={() => setOwlState('idle')}
          />
          {state?.errors?.username?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
          ))}
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="display_name" style={labelStyle}>Display Name</label>
          <input
            id="display_name" name="display_name" type="text"
            required
            className={inputClass} style={{ ...inputStyle, ...inputFocusStyle }}
            onFocus={() => setOwlState('watching')}
            onBlur={() => setOwlState('idle')}
          />
          {state?.errors?.display_name?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
          ))}
        </div>

        {/* Email — optional if phone is provided */}
        <div>
          <label htmlFor="email" style={labelStyle}>
            Email{' '}
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'rgba(22,24,29,0.4)' }}>
              (or use mobile below)
            </span>
          </label>
          <input
            id="email" name="email" type="email"
            autoComplete="email"
            placeholder="you@college.edu"
            className={inputClass} style={{ ...inputStyle, ...inputFocusStyle }}
            onFocus={() => setOwlState('watching')}
            onBlur={() => setOwlState('idle')}
          />
          {state?.errors?.email?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
          ))}
        </div>

        {/* Phone — optional if email is provided */}
        <div>
          <label htmlFor="phone" style={labelStyle}>
            Mobile number{' '}
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'rgba(22,24,29,0.4)' }}>
              (or use email above)
            </span>
          </label>
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
              id="phone" name="phone" type="tel"
              inputMode="numeric" maxLength={10}
              placeholder="9876543210"
              className="block w-full rounded-l-none rounded-r-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{ ...inputStyle, ...inputFocusStyle, borderLeft: 'none' }}
              onFocus={() => setOwlState('watching')}
              onBlur={() => setOwlState('idle')}
            />
          </div>
          {state?.errors?.phone?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
          ))}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" style={labelStyle}>Password</label>
          <div className="relative mt-1">
            <input
              id="password" name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password" required
              className="block w-full rounded-lg border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{ ...inputStyle, ...inputFocusStyle }}
              onFocus={() => setOwlState('covering')}
              onBlur={() => setOwlState('idle')}
            />
            <button
              type="button" onClick={togglePassword}
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
          <GalaxyButton pending={pending} label="Create account" pendingLabel="Creating account…" />
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
        Already have an account?{' '}
        <a href="/login" className="font-semibold hover:underline" style={{ color: '#16181d' }}>
          Log in
        </a>
      </p>

      <GalaxyWipe
        active={wipeActive}
        originX={wipeOrigin.x}
        originY={wipeOrigin.y}
        onComplete={() => router.push(pendingRedirect.current)}
      />
    </div>
  )
}
