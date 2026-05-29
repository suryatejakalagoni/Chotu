'use client'

import { useState, useEffect, useActionState } from 'react'
import {
  linkPhoneNumber,
  sendPasswordChangePhoneOtp,
  requestPasswordReset,
  verifyResetOtp,
  verifyPhoneOtp,
  updatePassword,
} from '@/lib/actions/auth'
import type {
  PhoneOtpSendState,
  PhoneOtpVerifyState,
  ForgotPasswordState,
  VerifyOtpState,
  UpdatePasswordState,
} from '@/lib/validations/auth'

const inputCls =
  'block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors bg-muted/50'

function EyeOpen() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
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

function Badge({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
      {ok ? '✓ Verified' : '⚠ Unverified'}
    </span>
  )
}

type Mode = null | 'addPhone' | 'changePw'

type Props = {
  email: string | null
  phone: string | null
  emailVerified: boolean
  isGoogleUser: boolean
}

export function AccountSection({ email, phone, emailVerified, isGoogleUser }: Props) {
  const [mode, setMode]           = useState<Mode>(null)
  const [pwMethod, setPwMethod]   = useState<'email' | 'phone'>(email ? 'email' : 'phone')
  const [pwStep, setPwStep]       = useState<1 | 2 | 3>(1)
  const [pwPhone, setPwPhone]     = useState(phone ?? '')
  const [pwOtp, setPwOtp]         = useState('')
  const [pwDone, setPwDone]       = useState(false)
  const [showPw, setShowPw]       = useState(false)
  const [showCf, setShowCf]       = useState(false)
  const [pwError, setPwError]     = useState<string | null>(null)

  const [addDone, setAddDone]     = useState(false)

  // ── server action states ──────────────────────────────────────────────────

  const [linkPhoneSt, linkPhoneAct, linkPhonePending] = useActionState<PhoneOtpSendState, FormData>(linkPhoneNumber, undefined)

  const [sendPwEmailSt, sendPwEmailAct, sendPwEmailPending]    = useActionState<ForgotPasswordState, FormData>(requestPasswordReset, undefined)
  const [verifyPwEmailSt, verifyPwEmailAct, verifyPwEmailPend] = useActionState<VerifyOtpState, FormData>(verifyResetOtp, undefined)

  const [sendPwPhoneSt, sendPwPhoneAct, sendPwPhonePending]    = useActionState<PhoneOtpSendState, FormData>(sendPasswordChangePhoneOtp, undefined)
  const [verifyPwPhoneSt, verifyPwPhoneAct, verifyPwPhonePend] = useActionState<PhoneOtpVerifyState, FormData>(verifyPhoneOtp, undefined)

  const [updatePwSt, updatePwAct, updatePwPending] = useActionState<UpdatePasswordState, FormData>(updatePassword, undefined)

  // ── effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!linkPhoneSt?.success) return
    setAddDone(true)
    setTimeout(() => { setMode(null); setAddDone(false) }, 2500)
  }, [linkPhoneSt]) // eslint-disable-line

  useEffect(() => { if (sendPwEmailSt?.success   && pwStep === 1) setPwStep(2) }, [sendPwEmailSt])   // eslint-disable-line
  useEffect(() => { if (verifyPwEmailSt?.success && pwStep === 2) { setPwStep(3); setPwOtp('') } }, [verifyPwEmailSt]) // eslint-disable-line
  useEffect(() => {
    if (sendPwPhoneSt?.success && sendPwPhoneSt.phone && pwStep === 1) { setPwPhone(sendPwPhoneSt.phone); setPwStep(2) }
  }, [sendPwPhoneSt]) // eslint-disable-line
  useEffect(() => { if (verifyPwPhoneSt?.success && pwStep === 2) { setPwStep(3); setPwOtp('') } }, [verifyPwPhoneSt]) // eslint-disable-line

  useEffect(() => { setPwError(updatePwSt?.message ?? null) }, [updatePwSt])
  useEffect(() => {
    if (!updatePwSt?.success) return
    setPwDone(true)
    setTimeout(() => { setMode(null); setPwDone(false); setPwStep(1); }, 2500)
  }, [updatePwSt]) // eslint-disable-line

  const close = () => {
    setMode(null); setPwStep(1); setPwOtp('')
    setPwError(null); setPwDone(false); setAddDone(false)
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  const maskEmail = (e: string) => { const at = e.indexOf('@'); return at <= 0 ? e : e[0] + '•••' + e.slice(at) }
  const fmtPhone  = (p: string) => p.replace(/^\+91/, '+91 ')

  const sendPwEmailErr  = sendPwEmailSt?.message
  const verifyPwEmailErr = verifyPwEmailSt?.message
  const sendPwPhoneErr  = sendPwPhoneSt?.message
  const verifyPwPhoneErr = verifyPwPhoneSt?.message

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Account</h2>

      {/* Info table */}
      <div className="rounded-xl border divide-y text-sm">

        {/* Email row */}
        {email && (
          <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">Email</p>
              <p className="font-medium">{email}</p>
            </div>
            <Badge ok={emailVerified} />
          </div>
        )}

        {/* Phone row */}
        <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">Mobile</p>
            {phone
              ? <p className="font-medium">{fmtPhone(phone)}</p>
              : <p className="text-muted-foreground italic">Not linked</p>
            }
          </div>
          {phone
            ? <Badge ok={true} />
            : (
              <button
                type="button"
                onClick={() => setMode(mode === 'addPhone' ? null : 'addPhone')}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors"
              >
                {mode === 'addPhone' ? 'Cancel' : 'Add mobile number'}
              </button>
            )
          }
        </div>

        {/* Password row — hidden for Google-only users */}
        {!isGoogleUser && email && (
          <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-0.5">Password</p>
              <p className="font-medium tracking-widest">••••••••</p>
            </div>
            <button
              type="button"
              onClick={() => setMode(mode === 'changePw' ? null : 'changePw')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border hover:bg-accent transition-colors"
            >
              {mode === 'changePw' ? 'Cancel' : 'Change password'}
            </button>
          </div>
        )}
      </div>

      {/* ── Add phone inline form ─────────────────────────────────────────── */}
      {mode === 'addPhone' && (
        <div className="rounded-xl border p-4 space-y-4 bg-muted/30">
          <p className="text-sm font-medium">Link a mobile number</p>
          <p className="text-xs text-muted-foreground">
            Your number will be saved to your account and can be used to sign in or recover your password.
          </p>

          {addDone ? (
            <p className="text-sm font-semibold text-emerald-600">✓ Mobile number linked successfully!</p>
          ) : (
            <form action={linkPhoneAct} className="space-y-3">
              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                  Mobile Number
                </label>
                <div className="flex">
                  <span className="flex items-center px-3 rounded-l-lg border border-r-0 bg-muted text-sm text-muted-foreground select-none flex-shrink-0">
                    +91
                  </span>
                  <input
                    name="phone" type="tel" inputMode="numeric"
                    maxLength={10} placeholder="9876543210" required
                    className="block w-full rounded-l-none rounded-r-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-muted/50"
                  />
                </div>
                {linkPhoneSt?.errors?.phone?.map(e => (
                  <p key={e} className="mt-1 text-xs text-destructive">{e}</p>
                ))}
                {linkPhoneSt?.message && <p className="mt-1 text-xs text-destructive">{linkPhoneSt.message}</p>}
              </div>
              <button
                type="submit" disabled={linkPhonePending}
                className="w-full rounded-lg py-2.5 text-sm font-semibold bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {linkPhonePending ? 'Saving…' : 'Save mobile number'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* ── Change password inline form ───────────────────────────────────── */}
      {mode === 'changePw' && (
        <div className="rounded-xl border p-4 space-y-4 bg-muted/30">
          <p className="text-sm font-medium">Change password</p>

          {pwDone ? (
            <p className="text-sm font-semibold text-emerald-600">✓ Password updated successfully!</p>
          ) : (
            <>
              {/* Step 1 — choose method + send code */}
              {pwStep === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Choose how you want to receive a verification code.
                  </p>

                  {/* Method tabs */}
                  <div style={{ display: 'flex', background: 'var(--muted)', borderRadius: '0.5rem', padding: '3px' }}>
                    {(['email', 'phone'] as const).filter(m => m === 'email' ? !!email : !!phone).map(tab => (
                      <button
                        key={tab} type="button"
                        onClick={() => { setPwMethod(tab); setPwOtp('') }}
                        style={{
                          flex: 1, padding: '0.35rem', borderRadius: '0.35rem',
                          fontSize: '0.8125rem', fontWeight: 500, border: 'none', cursor: 'pointer',
                          background: pwMethod === tab ? 'var(--background)' : 'transparent',
                          boxShadow: pwMethod === tab ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                          transition: 'all 0.15s',
                        }}
                      >
                        {tab === 'email' ? `Email` : `Phone`}
                      </button>
                    ))}
                  </div>

                  {/* Email send */}
                  {pwMethod === 'email' && email && (
                    <form action={sendPwEmailAct} className="space-y-3">
                      <input type="hidden" name="email" value={email} />
                      <p className="text-sm text-muted-foreground">
                        Send a code to <strong className="text-foreground">{maskEmail(email)}</strong>
                      </p>
                      {sendPwEmailErr && <p className="text-xs text-destructive">{sendPwEmailErr}</p>}
                      <button
                        type="submit" disabled={sendPwEmailPending}
                        className="w-full rounded-lg py-2.5 text-sm font-semibold bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-50"
                      >
                        {sendPwEmailPending ? 'Sending…' : 'Send code to email'}
                      </button>
                    </form>
                  )}

                  {/* Phone send */}
                  {pwMethod === 'phone' && phone && (
                    <form action={sendPwPhoneAct} className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Send a code to <strong className="text-foreground">{fmtPhone(phone)}</strong>
                      </p>
                      {sendPwPhoneErr && <p className="text-xs text-destructive">{sendPwPhoneErr}</p>}
                      <button
                        type="submit" disabled={sendPwPhonePending}
                        className="w-full rounded-lg py-2.5 text-sm font-semibold bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-50"
                      >
                        {sendPwPhonePending ? 'Sending…' : 'Send OTP to phone'}
                      </button>
                    </form>
                  )}

                  {!email && !phone && (
                    <p className="text-sm text-muted-foreground">No email or phone linked. Please add one first.</p>
                  )}
                </div>
              )}

              {/* Step 2 — verify code */}
              {pwStep === 2 && (
                <div className="space-y-4">
                  {pwMethod === 'email' ? (
                    <form action={verifyPwEmailAct} className="space-y-3">
                      <input type="hidden" name="email" value={email ?? ''} />
                      <p className="text-sm text-muted-foreground">
                        Enter the 8-digit code sent to{' '}
                        <strong className="text-foreground">{maskEmail(email ?? '')}</strong>
                      </p>
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                          8-digit code
                        </label>
                        <input
                          name="token" type="tel" inputMode="numeric"
                          maxLength={8} pattern="\d{8}" placeholder="00000000" required
                          value={pwOtp} onChange={e => setPwOtp(e.target.value.replace(/\D/g,'').slice(0,8))}
                          className={`${inputCls} text-center tracking-[0.3em] text-lg`}
                        />
                        {verifyPwEmailErr && <p className="mt-1 text-xs text-destructive">{verifyPwEmailErr}</p>}
                      </div>
                      <button
                        type="submit" disabled={verifyPwEmailPend || pwOtp.length !== 8}
                        className="w-full rounded-lg py-2.5 text-sm font-semibold bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-50"
                      >
                        {verifyPwEmailPend ? 'Verifying…' : 'Verify code'}
                      </button>
                      <button type="button" onClick={() => { setPwStep(1); setPwOtp('') }} className="w-full text-xs text-muted-foreground hover:underline">
                        ← Back
                      </button>
                    </form>
                  ) : (
                    <form action={verifyPwPhoneAct} className="space-y-3">
                      <input type="hidden" name="phone" value={pwPhone} />
                      <p className="text-sm text-muted-foreground">
                        Enter the 6-digit code sent to{' '}
                        <strong className="text-foreground">{fmtPhone(pwPhone)}</strong>
                      </p>
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                          6-digit code
                        </label>
                        <input
                          name="token" type="tel" inputMode="numeric"
                          maxLength={6} pattern="[0-9]{6}" placeholder="000000" required
                          value={pwOtp} onChange={e => setPwOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                          className={`${inputCls} text-center tracking-[0.3em] text-lg`}
                        />
                        {verifyPwPhoneErr && <p className="mt-1 text-xs text-destructive">{verifyPwPhoneErr}</p>}
                      </div>
                      <button
                        type="submit" disabled={verifyPwPhonePend || pwOtp.length !== 6}
                        className="w-full rounded-lg py-2.5 text-sm font-semibold bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-50"
                      >
                        {verifyPwPhonePend ? 'Verifying…' : 'Verify code'}
                      </button>
                      <button type="button" onClick={() => { setPwStep(1); setPwOtp('') }} className="w-full text-xs text-muted-foreground hover:underline">
                        ← Back
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Step 3 — new password */}
              {pwStep === 3 && (
                <form action={updatePwAct} onSubmit={() => setPwError(null)} className="space-y-3">
                  <p className="text-sm text-muted-foreground">Code verified. Choose a new password.</p>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                      New password
                    </label>
                    <div className="relative">
                      <input
                        name="password" type={showPw ? 'text' : 'password'}
                        autoComplete="new-password" required
                        className={`${inputCls} pr-10`}
                      />
                      <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide' : 'Show'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:opacity-70">
                        {showPw ? <EyeOpen /> : <EyeClosed />}
                      </button>
                    </div>
                    {updatePwSt?.errors?.password?.map(e => <p key={e} className="mt-1 text-xs text-destructive">{e}</p>)}
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        name="confirm" type={showCf ? 'text' : 'password'}
                        autoComplete="new-password" required
                        className={`${inputCls} pr-10`}
                      />
                      <button type="button" onClick={() => setShowCf(v => !v)} aria-label={showCf ? 'Hide' : 'Show'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:opacity-70">
                        {showCf ? <EyeOpen /> : <EyeClosed />}
                      </button>
                    </div>
                    {updatePwSt?.errors?.confirm?.map(e => <p key={e} className="mt-1 text-xs text-destructive">{e}</p>)}
                  </div>

                  {pwError && <p className="text-xs text-destructive">{pwError}</p>}

                  <button
                    type="submit" disabled={updatePwPending}
                    className="w-full rounded-lg py-2.5 text-sm font-semibold bg-foreground text-background hover:opacity-80 transition-opacity disabled:opacity-50"
                  >
                    {updatePwPending ? 'Saving…' : 'Save new password'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
