'use client'

import { useState, useEffect, useRef, useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  requestPasswordReset,
  resendPasswordReset,
  verifyResetOtp,
  updatePassword,
} from '@/lib/actions/auth'
import type {
  ForgotPasswordState,
  VerifyOtpState,
  UpdatePasswordState,
} from '@/lib/validations/auth'
import { useOwlState } from '@/components/auth/OwlContext'
import { GalaxyButton } from '@/components/auth/GalaxyButton'
import { GalaxyWipe } from '@/components/auth/GalaxyWipe'

const RESEND_COOLDOWN_S = 60

function maskEmail(email: string): string {
  const at = email.indexOf('@')
  if (at <= 0) return email
  return email[0] + '•••' + email.slice(at)
}

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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [wipeActive, setWipeActive] = useState(false)
  const [wipeOrigin, setWipeOrigin] = useState({ x: 0, y: 0 })
  const [showSuccess, setShowSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_S)
  const wipeArmedRef = useRef(false)
  const btnWrapperRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { setOwlState } = useOwlState()
  const [resendPending, startResendTransition] = useTransition()

  const [step1State, step1Action, step1Pending] = useActionState<ForgotPasswordState, FormData>(
    requestPasswordReset,
    undefined
  )
  const [step2State, step2Action, step2Pending] = useActionState<VerifyOtpState, FormData>(
    verifyResetOtp,
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

  // Step 2 → step 3
  useEffect(() => {
    if (step2State?.success && step === 2) {
      setOtp('')
      setStep(3)
    }
  }, [step2State]) // eslint-disable-line react-hooks/exhaustive-deps

  // Step 3 error → local message
  useEffect(() => {
    setPwError(step3State?.message ?? null)
  }, [step3State])

  // Step 3 success → show winking owl + message → GalaxyWipe after 1.8 s
  useEffect(() => {
    if (!step3State?.success || wipeArmedRef.current) return
    wipeArmedRef.current = true
    setShowSuccess(true)
    setOwlState('wink')
    const rect = btnWrapperRef.current?.getBoundingClientRect()
    setWipeOrigin({
      x: rect && rect.width > 0 ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect && rect.height > 0 ? rect.top + rect.height / 2 : window.innerHeight / 2,
    })
    const t = setTimeout(() => setWipeActive(true), 1800)
    return () => clearTimeout(t)
  }, [step3State]) // eslint-disable-line react-hooks/exhaustive-deps

  // Step 2 owl state — watching by default, sympathetic on error
  useEffect(() => {
    if (step !== 2) return
    setOwlState(step2State?.message ? 'sympathetic' : 'watching')
  }, [step, step2State?.message]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resend countdown — starts/restarts whenever step becomes 2
  useEffect(() => {
    if (step !== 2) return
    setResendCooldown(RESEND_COOLDOWN_S)
    const id = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(id); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [step])

  const handleResend = () => {
    if (resendPending || resendCooldown > 0) return
    const fd = new FormData()
    fd.append('email', emailInput)
    startResendTransition(async () => {
      await resendPasswordReset(undefined, fd)
      setResendCooldown(RESEND_COOLDOWN_S)
      setOtp('')
    })
  }

  const handleBackToStep1 = () => {
    setStep(1)
    setOtp('')
    setOwlState('idle')
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
      </div>
    )
  }

  // ─── Step 2: OTP entry ────────────────────────────────────────────────────────

  if (step === 2) {
    const isLocked = step2State?.locked === true
    const hasError = Boolean(step2State?.message) && !isLocked

    return (
      <div className="space-y-5">
        {/* Personality callout — switches to sympathetic message on wrong OTP */}
        <p
          role={hasError ? 'alert' : undefined}
          className="text-center text-xs"
          style={{
            color: hasError ? 'rgba(22,24,29,0.7)' : 'rgba(22,24,29,0.42)',
            fontStyle: hasError ? 'normal' : 'italic',
            letterSpacing: hasError ? 'normal' : '0.01em',
          }}
        >
          {hasError
            ? "That code didn't match. Want me to send a fresh one?"
            : "Check your inbox. I'm watching the clock 👀"}
        </p>

        <p className="text-sm" style={{ color: 'rgba(22,24,29,0.65)' }}>
          Sent to <strong style={{ color: '#16181d' }}>{maskEmail(emailInput)}</strong>.
          Enter the 6-digit code from the email.
        </p>

        <form action={step2Action} className="space-y-4">
          {/* email passed through as hidden — needed server-side for verifyOtp */}
          <input type="hidden" name="email" value={emailInput} />

          <div>
            <label htmlFor="otp" style={labelStyle}>8-digit code</label>
            <input
              id="otp"
              name="token"
              type="text"
              inputMode="numeric"
              pattern="\d{8}"
              maxLength={8}
              autoComplete="one-time-code"
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
              disabled={isLocked || step2Pending}
              placeholder="00000000"
              className={`${inputClass} text-center font-mono tracking-[0.4em] text-base`}
              style={{
                ...inputStyle,
                ...inputFocusStyle,
                borderColor: hasError ? 'rgba(220,38,38,0.4)' : 'rgba(0,0,0,0.2)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLocked || step2Pending || otp.length !== 8}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: '#1a1a1a', color: '#fff' }}
          >
            {step2Pending ? 'Verifying…' : 'Verify code'}
          </button>
        </form>

        {!isLocked && (
          <div className="flex items-center justify-between text-sm" style={{ color: 'rgba(22,24,29,0.65)' }}>
            <button
              type="button"
              onClick={handleBackToStep1}
              className="hover:underline"
              style={{ color: '#16181d', fontWeight: 500 }}
            >
              Wrong email?
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resendPending}
              className="hover:underline disabled:cursor-default disabled:no-underline"
              style={{
                color: resendCooldown > 0 || resendPending ? 'rgba(22,24,29,0.4)' : '#16181d',
                fontWeight: 500,
              }}
            >
              {resendPending
                ? 'Sending…'
                : resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend code'}
            </button>
          </div>
        )}

        {isLocked && (
          <p className="text-center text-sm" style={{ color: 'rgba(22,24,29,0.65)' }}>
            Come back in 15 minutes, then{' '}
            <button
              type="button"
              onClick={handleBackToStep1}
              className="font-semibold hover:underline"
              style={{ color: '#16181d' }}
            >
              try again
            </button>
            .
          </p>
        )}
      </div>
    )
  }

  // ─── Step 3: New password / Success ─────────────────────────────────────────

  return (
    <div className="space-y-6">
      {showSuccess ? (
        /* Success — winking owl is already set; GalaxyWipe fires after 1.8 s */
        <div style={{ textAlign: 'center', padding: '1.5rem 0 2.5rem' }}>
          <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#16181d' }}>
            Password updated!
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'rgba(22,24,29,0.55)' }}>
            Welcome back. Maybe write it down this time? 🦉
          </p>
        </div>
      ) : (
        <>
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
        </>
      )}

      <GalaxyWipe
        active={wipeActive}
        originX={wipeOrigin.x}
        originY={wipeOrigin.y}
        onComplete={() => router.push('/dashboard')}
      />
    </div>
  )
}
