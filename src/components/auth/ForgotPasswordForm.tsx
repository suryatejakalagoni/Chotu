'use client'

import { useState, useEffect, useRef, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { requestPasswordReset, updatePassword } from '@/lib/actions/auth'
import type { ForgotPasswordState, UpdatePasswordState } from '@/lib/validations/auth'
import { useOwlState } from '@/components/auth/OwlContext'
import { GalaxyButton } from '@/components/auth/GalaxyButton'
import { GalaxyWipe } from '@/components/auth/GalaxyWipe'

const OTP_MAX_ATTEMPTS = 5

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

export default function ForgotPasswordForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [emailInput, setEmailInput] = useState('')
  const [otp, setOtp] = useState('')
  const [otpAttempts, setOtpAttempts] = useState(0)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpPending, setOtpPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [wipeActive, setWipeActive] = useState(false)
  const [wipeOrigin, setWipeOrigin] = useState({ x: 0, y: 0 })
  const wipeArmedRef = useRef(false)
  const btnWrapperRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { setOwlState } = useOwlState()

  const [step1State, step1Action, step1Pending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordReset,
    undefined
  )
  const [step3State, step3Action, step3Pending] = useActionState<UpdatePasswordState, FormData>(
    updatePassword,
    undefined
  )

  // Step 1 → step 2
  useEffect(() => {
    if (step1State?.success && step === 1) setStep(2)
  }, [step1State]) // eslint-disable-line react-hooks/exhaustive-deps

  // Step 3 message → local error
  useEffect(() => {
    setPwError(step3State?.message ?? null)
  }, [step3State])

  // Step 3 success → GalaxyWipe → dashboard
  useEffect(() => {
    if (!step3State?.success || wipeArmedRef.current) return
    wipeArmedRef.current = true
    const rect = btnWrapperRef.current?.getBoundingClientRect()
    setWipeOrigin({
      x: rect && rect.width > 0 ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect && rect.height > 0 ? rect.top + rect.height / 2 : window.innerHeight / 2,
    })
    setWipeActive(true)
  }, [step3State])

  const otpLocked = otpAttempts >= OTP_MAX_ATTEMPTS

  const handleOtpVerify = async () => {
    if (otpLocked || otpPending || otp.length !== 6) return
    setOtpError(null)
    setOtpPending(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({
        email: emailInput,
        token: otp,
        type: 'email',
      })

      if (error) {
        const next = otpAttempts + 1
        setOtpAttempts(next)
        if (next >= OTP_MAX_ATTEMPTS) {
          setOtpError('Too many incorrect attempts. Please request a new code.')
        } else {
          const rem = OTP_MAX_ATTEMPTS - next
          setOtpError(`Incorrect code. ${rem} attempt${rem === 1 ? '' : 's'} remaining.`)
        }
      } else {
        setStep(3)
      }
    } catch {
      setOtpError('Something went wrong. Please try again.')
    } finally {
      setOtpPending(false)
    }
  }

  const handleBackToEmail = () => {
    setStep(1)
    setOtp('')
    setOtpAttempts(0)
    setOtpError(null)
  }

  // ─── Step 1: Email ────────────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <div className="space-y-6">
        <p className="text-sm" style={{ color: 'rgba(22,24,29,0.65)' }}>
          Enter your email and we&apos;ll send a 6-digit code.
        </p>

        <form action={step1Action} className="space-y-4">
          <div>
            <label htmlFor="email" style={labelStyle}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className={inputClass}
              style={{ ...inputStyle, ...inputFocusStyle }}
              onFocus={() => setOwlState('watching')}
              onBlur={() => setOwlState('idle')}
            />
            {step1State?.errors?.email?.map((e) => (
              <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
            ))}
          </div>

          <GalaxyButton pending={step1Pending} label="Send code" pendingLabel="Sending…" />
        </form>

        <p className="text-center text-sm" style={{ color: 'rgba(22,24,29,0.65)' }}>
          Remember it?{' '}
          <a href="/login" className="font-semibold hover:underline" style={{ color: '#16181d' }}>
            Sign in
          </a>
        </p>
      </div>
    )
  }

  // ─── Step 2: OTP ─────────────────────────────────────────────────────────────

  if (step === 2) {
    return (
      <div className="space-y-6">
        <p className="text-sm" style={{ color: 'rgba(22,24,29,0.65)' }}>
          Check <strong style={{ color: '#16181d' }}>{emailInput}</strong> for a 6-digit code.
          It may take a minute.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="otp" style={labelStyle}>6-digit code</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                setOtpError(null)
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleOtpVerify() }}
              disabled={otpLocked || otpPending}
              placeholder="000000"
              className={`${inputClass} text-center font-mono tracking-[0.4em] text-base`}
              style={{ ...inputStyle, ...inputFocusStyle }}
            />
            {otpError && (
              <p role="alert" className="mt-1 text-xs" style={{ color: '#dc2626' }}>{otpError}</p>
            )}
          </div>

          <div ref={btnWrapperRef}>
            <button
              type="button"
              onClick={handleOtpVerify}
              disabled={otpLocked || otpPending || otp.length !== 6}
              className="w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ background: '#1a1a1a', color: '#fff' }}
            >
              {otpPending ? 'Verifying…' : 'Verify code'}
            </button>
          </div>
        </div>

        <p className="text-center text-sm" style={{ color: 'rgba(22,24,29,0.65)' }}>
          Wrong email or need a new code?{' '}
          <button
            type="button"
            onClick={handleBackToEmail}
            className="font-semibold hover:underline"
            style={{ color: '#16181d' }}
          >
            Go back
          </button>
        </p>
      </div>
    )
  }

  // ─── Step 3: New password ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <p className="text-sm" style={{ color: 'rgba(22,24,29,0.65)' }}>
        Choose a new password for your account.
      </p>

      <form
        action={step3Action}
        onSubmit={() => setPwError(null)}
        className="space-y-4"
      >
        <div>
          <label htmlFor="password" style={labelStyle}>New password</label>
          <div className="relative mt-1">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              className="block w-full rounded-lg border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{ ...inputStyle, ...inputFocusStyle }}
              onFocus={() => setOwlState('covering')}
              onBlur={() => setOwlState('idle')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-opacity hover:opacity-70 focus:outline-none"
              style={{ color: 'rgba(22,24,29,0.45)' }}
            >
              {showPassword ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
          {step3State?.errors?.password?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
          ))}
        </div>

        <div>
          <label htmlFor="confirm" style={labelStyle}>Confirm password</label>
          <div className="relative mt-1">
            <input
              id="confirm"
              name="confirm"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              required
              className="block w-full rounded-lg border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{ ...inputStyle, ...inputFocusStyle }}
              onFocus={() => setOwlState('covering')}
              onBlur={() => setOwlState('idle')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-opacity hover:opacity-70 focus:outline-none"
              style={{ color: 'rgba(22,24,29,0.45)' }}
            >
              {showConfirm ? <EyeOpen /> : <EyeClosed />}
            </button>
          </div>
          {step3State?.errors?.confirm?.map((e) => (
            <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
          ))}
        </div>

        <div ref={btnWrapperRef}>
          <GalaxyButton pending={step3Pending} label="Set new password" pendingLabel="Saving…" />
        </div>

        {pwError && (
          <p role="alert" className="mt-2 text-sm" style={{ color: '#dc2626' }}>{pwError}</p>
        )}
      </form>

      <GalaxyWipe
        active={wipeActive}
        originX={wipeOrigin.x}
        originY={wipeOrigin.y}
        onComplete={() => router.push('/dashboard')}
      />
    </div>
  )
}
