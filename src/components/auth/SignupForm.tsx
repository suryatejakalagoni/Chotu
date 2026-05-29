'use client'

import { useState, useEffect, useRef, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { signUp, signInWithGoogle, sendSignupPhoneOtp, verifyPhoneOtp } from '@/lib/actions/auth'
import { type SignupFormState, type PhoneOtpSendState, type PhoneOtpVerifyState } from '@/lib/validations/auth'
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
  const [activeTab, setActiveTab] = useState<'email' | 'phone'>('email')

  // Email auth state
  const [state, action, pending] = useActionState<SignupFormState, FormData>(signUp, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const [eyeKey, setEyeKey]             = useState(0)
  const [authError, setAuthError]       = useState<string | null>(null)

  // Phone auth state
  const [sendState, sendAction, sendPending] = useActionState<PhoneOtpSendState, FormData>(sendSignupPhoneOtp, undefined)
  const [verifyState, verifyAction, verifyPending] = useActionState<PhoneOtpVerifyState, FormData>(verifyPhoneOtp, undefined)
  const [phoneStep, setPhoneStep]     = useState<'phone' | 'otp'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [sendError, setSendError]     = useState<string | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  const { setOwlState }  = useOwlState()
  const router           = useRouter()
  const btnWrapperRef    = useRef<HTMLDivElement>(null)
  const [wipeActive, setWipeActive]   = useState(false)
  const [wipeOrigin, setWipeOrigin]   = useState({ x: 0, y: 0 })
  const wipeArmedRef     = useRef(false)
  // tracks which route to use after wipe
  const pendingRedirect  = useRef('/verify-email')

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
  useEffect(() => { if (state?.success) armWipe('/verify-email') }, [state])

  useEffect(() => { setSendError(sendState?.message ?? null) }, [sendState])
  useEffect(() => {
    if (sendState?.success && sendState.phone) {
      setPhoneNumber(sendState.phone)
      setPhoneStep('otp')
    }
  }, [sendState])

  useEffect(() => { setVerifyError(verifyState?.message ?? null) }, [verifyState])
  // Phone OTP verified → go straight to dashboard (phone is already verified)
  useEffect(() => { if (verifyState?.success) armWipe('/dashboard') }, [verifyState])

  const togglePassword = () => {
    setShowPassword(v => !v)
    setEyeKey(k => k + 1)
  }

  const switchTab = (tab: 'email' | 'phone') => {
    setActiveTab(tab)
    wipeArmedRef.current = false
  }

  return (
    <div className="space-y-6">

      {/* Tab switcher */}
      <div style={{ display: 'flex', background: '#eceef1', borderRadius: '0.5rem', padding: '3px' }}>
        {(['email', 'phone'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => switchTab(tab)}
            style={{
              flex: 1,
              padding: '0.375rem',
              borderRadius: '0.35rem',
              fontSize: '0.8125rem',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === tab ? '#fff' : 'transparent',
              color: '#16181d',
              boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {tab === 'email' ? 'Email' : 'Phone'}
          </button>
        ))}
      </div>

      {/* Email tab */}
      {activeTab === 'email' && (
        <form
          action={action}
          onSubmit={() => setAuthError(null)}
          className="space-y-4"
        >
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
            <GalaxyButton pending={pending} label="Create account" pendingLabel="Creating account…" />
          </div>

          {authError && (
            <p role="alert" className="mt-2 text-sm" style={{ color: '#dc2626' }}>
              {authError}
            </p>
          )}
        </form>
      )}

      {/* Phone tab */}
      {activeTab === 'phone' && (
        <>
          {phoneStep === 'phone' ? (
            <form
              action={sendAction}
              onSubmit={() => setSendError(null)}
              className="space-y-4"
            >
              {/* Username */}
              <div>
                <label
                  htmlFor="p-username"
                  className="block text-xs font-medium uppercase tracking-widest mb-1"
                  style={{ color: 'rgba(22,24,29,0.65)' }}
                >
                  Username
                </label>
                <input
                  id="p-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className={inputClass}
                  style={{ ...inputStyle, ...inputFocusStyle }}
                  onFocus={() => setOwlState('watching')}
                  onBlur={() => setOwlState('idle')}
                />
                {sendState?.errors?.username?.map((e) => (
                  <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
                ))}
              </div>

              {/* Display Name */}
              <div>
                <label
                  htmlFor="p-display_name"
                  className="block text-xs font-medium uppercase tracking-widest mb-1"
                  style={{ color: 'rgba(22,24,29,0.65)' }}
                >
                  Display Name
                </label>
                <input
                  id="p-display_name"
                  name="display_name"
                  type="text"
                  required
                  className={inputClass}
                  style={{ ...inputStyle, ...inputFocusStyle }}
                  onFocus={() => setOwlState('watching')}
                  onBlur={() => setOwlState('idle')}
                />
                {sendState?.errors?.display_name?.map((e) => (
                  <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
                ))}
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-medium uppercase tracking-widest mb-1"
                  style={{ color: 'rgba(22,24,29,0.65)' }}
                >
                  Mobile Number
                </label>
                <div className="flex mt-1">
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 0.75rem',
                      background: '#dde0e5',
                      borderRadius: '0.5rem 0 0 0.5rem',
                      border: '1px solid rgba(0,0,0,0.2)',
                      borderRight: 'none',
                      fontSize: '0.875rem',
                      color: 'rgba(22,24,29,0.7)',
                      flexShrink: 0,
                      userSelect: 'none',
                    }}
                  >
                    +91
                  </span>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="9876543210"
                    required
                    className="block w-full rounded-l-none rounded-r-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors"
                    style={{ ...inputStyle, ...inputFocusStyle, borderLeft: 'none' }}
                    onFocus={() => setOwlState('watching')}
                    onBlur={() => setOwlState('idle')}
                  />
                </div>
                {sendState?.errors?.phone?.map((e) => (
                  <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
                ))}
              </div>

              <div ref={btnWrapperRef}>
                <GalaxyButton pending={sendPending} label="Send OTP" pendingLabel="Sending…" />
              </div>

              {sendError && (
                <p role="alert" className="mt-2 text-sm" style={{ color: '#dc2626' }}>
                  {sendError}
                </p>
              )}
            </form>
          ) : (
            <form
              action={verifyAction}
              onSubmit={() => setVerifyError(null)}
              className="space-y-4"
            >
              <input type="hidden" name="phone" value={phoneNumber} />

              <div>
                <p className="text-sm mb-3" style={{ color: 'rgba(22,24,29,0.7)' }}>
                  Code sent to{' '}
                  <strong style={{ color: '#16181d' }}>
                    {phoneNumber.replace(/^\+91/, '+91 ')}
                  </strong>
                  .{' '}
                  <button
                    type="button"
                    onClick={() => { setPhoneStep('phone'); setPhoneNumber('') }}
                    className="underline"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', color: '#16181d', padding: 0 }}
                  >
                    Change
                  </button>
                </p>
                <label
                  htmlFor="token"
                  className="block text-xs font-medium uppercase tracking-widest mb-1"
                  style={{ color: 'rgba(22,24,29,0.65)' }}
                >
                  Verification Code
                </label>
                <input
                  id="token"
                  name="token"
                  type="tel"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  required
                  className={inputClass}
                  style={{ ...inputStyle, ...inputFocusStyle, letterSpacing: '0.3em', textAlign: 'center', fontSize: '1.25rem' }}
                  onFocus={() => setOwlState('watching')}
                  onBlur={() => setOwlState('idle')}
                />
                {verifyState?.errors?.token?.map((e) => (
                  <p key={e} className="mt-1 text-xs" style={{ color: '#dc2626' }}>{e}</p>
                ))}
              </div>

              <div ref={btnWrapperRef}>
                <GalaxyButton pending={verifyPending} label="Verify & Create account" pendingLabel="Verifying…" />
              </div>

              {verifyError && (
                <p role="alert" className="mt-2 text-sm" style={{ color: '#dc2626' }}>
                  {verifyError}
                </p>
              )}
            </form>
          )}
        </>
      )}

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ borderTop: '1px solid rgba(0,0,0,0.1)' }} />
        </div>
        <div className="relative flex justify-center text-xs">
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

      <GalaxyWipe
        active={wipeActive}
        originX={wipeOrigin.x}
        originY={wipeOrigin.y}
        onComplete={() => router.push(pendingRedirect.current)}
      />
    </div>
  )
}
