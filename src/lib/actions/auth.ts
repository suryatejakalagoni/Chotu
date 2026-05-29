'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  SignupSchema,
  LoginSchema,
  ForgotPasswordEmailSchema,
  NewPasswordSchema,
  PhoneSchema,
  PhoneSignupSchema,
  PhoneOtpSchema,
  type SignupFormState,
  type LoginFormState,
  type ForgotPasswordState,
  type UpdatePasswordState,
  type VerifyOtpState,
  type PhoneOtpSendState,
  type PhoneOtpVerifyState,
} from '@/lib/validations/auth'

const RATE_LIMIT_MAX = 5
const WINDOW_MS = 15 * 60 * 1000

async function getClientIp(): Promise<string> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

async function checkRateLimit(key: string): Promise<boolean> {
  const admin = createAdminClient()
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString()

  const { count } = await admin
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('key', key)
    .gte('attempted_at', windowStart)

  if ((count ?? 0) >= RATE_LIMIT_MAX) return false

  await admin.from('rate_limits').insert({ key })
  return true
}

async function isAccountLocked(email: string): Promise<boolean> {
  const admin = createAdminClient()
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString()

  const { count } = await admin
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('email', email.toLowerCase())
    .gte('attempted_at', windowStart)

  return (count ?? 0) >= RATE_LIMIT_MAX
}

async function recordLoginAttempt(email: string, ip: string): Promise<void> {
  const admin = createAdminClient()
  await admin.from('login_attempts').insert({ email: email.toLowerCase(), ip })
}

export async function signUp(
  _prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const ip = await getClientIp()

  const allowed = await checkRateLimit(`signup:${ip}`)
  if (!allowed) {
    return { message: 'Too many attempts. Please try again in 15 minutes.' }
  }

  const rawPhone = String(formData.get('phone') ?? '').replace(/\s/g, '')
  const normalizedPhone = rawPhone
    ? rawPhone.startsWith('+91') ? rawPhone : `+91${rawPhone}`
    : undefined

  const validated = SignupSchema.safeParse({
    username:     formData.get('username'),
    display_name: formData.get('display_name'),
    email:        String(formData.get('email') ?? '').trim() || undefined,
    phone:        normalizedPhone,
    password:     formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors as NonNullable<SignupFormState>['errors'] }
  }

  const { username, display_name, email, phone, password } = validated.data
  const supabase = await createClient()

  if (email) {
    // Email signup — phone (if any) can be linked later via Settings
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, display_name } },
    })
    if (error) {
      console.error('[signUp email]', error.message)
      return { message: 'Could not create account. Please try again.' }
    }
    return { success: true }
  }

  // Phone-only signup — no email, use phone + password
  const { error } = await supabase.auth.signUp({
    phone: phone!,
    password,
    options: { data: { username, display_name } },
  })
  if (error) {
    console.error('[signUp phone]', error.message)
    return { message: 'Could not create account. Please try again.' }
  }
  return { success: true, phoneOnly: true, phone: phone! }
}

export async function logIn(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const ip = await getClientIp()

  const allowed = await checkRateLimit(`login:${ip}`)
  if (!allowed) {
    return { message: 'Too many attempts. Please try again in 15 minutes.' }
  }

  const validated = LoginSchema.safeParse({
    identifier: formData.get('identifier'),
    password:   formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { identifier, password } = validated.data

  // Detect phone: no @, only digits (and optional +/spaces)
  const digits   = identifier.replace(/\D/g, '')
  const isPhone  = !identifier.includes('@') && digits.length >= 10
  const phone    = isPhone
    ? (identifier.startsWith('+91') ? identifier : `+91${digits.slice(-10)}`)
    : null
  const email    = isPhone ? undefined : identifier

  if (isPhone && !/^\+91[6-9]\d{9}$/.test(phone!)) {
    return { errors: { identifier: ['Enter a valid email or 10-digit mobile number.'] } }
  }

  const key = isPhone ? phone! : email!
  const locked = await isAccountLocked(key)
  if (locked) {
    return { message: 'Too many failed attempts. Please try again in 15 minutes.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(
    isPhone ? { phone: phone!, password } : { email: email!, password }
  )

  if (error) {
    console.error('[logIn]', error.message)
    await recordLoginAttempt(key, ip)
    return { message: 'Invalid credentials.' }
  }

  return { success: true }
}

export async function logOut(_: FormData): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function signInWithGoogle(_: FormData): Promise<void> {
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const origin = `${protocol}://${host}`

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origin}/auth/callback` },
  })

  if (error || !data.url) {
    console.error('[signInWithGoogle]', error?.message)
    redirect('/login')
  }

  redirect(data.url)
}

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const ip = await getClientIp()

  const allowed = await checkRateLimit(`pwreset:${ip}`)
  if (!allowed) {
    return { success: true } // neutral — never reveal rate-limit to prevent enumeration
  }

  const validated = ForgotPasswordEmailSchema.safeParse({
    email: formData.get('email'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { email } = validated.data
  const supabase = await createClient()

  // resetPasswordForEmail sends a recovery OTP ({{ .Token }} in the email template).
  // Only sends if the account exists — never leaks account existence.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  })

  return { success: true }
}

export async function resendPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const ip = await getClientIp()

  const allowed = await checkRateLimit(`pwreset:${ip}`)
  if (!allowed) {
    return { success: true }
  }

  const email = String(formData.get('email') ?? '').trim()
  const parsed = ForgotPasswordEmailSchema.safeParse({ email })
  if (!parsed.success) return { success: true }

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  })

  return { success: true }
}

export async function verifyResetOtp(
  _prevState: VerifyOtpState,
  formData: FormData
): Promise<VerifyOtpState> {
  const ip = await getClientIp()

  const allowed = await checkRateLimit(`otp_verify:${ip}`)
  if (!allowed) {
    return { locked: true, message: 'Too many attempts. Please wait 15 minutes.' }
  }

  const email = String(formData.get('email') ?? '').trim()
  const token = String(formData.get('token') ?? '').replace(/\D/g, '')

  if (!email || token.length !== 8) {
    return { message: 'Something went wrong. Please start over.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    })

    if (error) {
      console.error('[verifyResetOtp]', error.message)
      return { message: 'That code didn\'t match. Check your email and try again.' }
    }

    return { success: true }
  } catch {
    return { message: 'Something went wrong. Please try again.' }
  }
}

export async function updatePassword(
  _prevState: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  const validated = NewPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { password } = validated.data

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return { message: 'Session expired. Please start over.' }
    }

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      console.error('[updatePassword]', error.message)
      return { message: 'Could not update password. Please try again.' }
    }
  } catch {
    return { message: 'Something went wrong. Please try again.' }
  }

  return { success: true }
}

// Links a phone number directly to the current user's account via admin client.
// No OTP needed here — ownership is verified when the phone is first used for
// password recovery (which requires receiving an OTP on that number).
export async function linkPhoneNumber(
  _prevState: PhoneOtpSendState,
  formData: FormData
): Promise<PhoneOtpSendState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { message: 'Please log in first.' }

  const raw = String(formData.get('phone') ?? '').replace(/\s/g, '')
  const phone = raw.startsWith('+91') ? raw : `+91${raw}`

  const validated = PhoneSchema.safeParse({ phone })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    phone: validated.data.phone,
  })

  if (error) {
    console.error('[linkPhoneNumber]', error.message)
    return { message: 'Could not save mobile number. Please try again.' }
  }

  return { success: true, phone: validated.data.phone }
}

export async function sendPasswordChangePhoneOtp(
  _prevState: PhoneOtpSendState,
  _formData: FormData
): Promise<PhoneOtpSendState> {
  const ip = await getClientIp()
  const allowed = await checkRateLimit(`phone_otp:${ip}`)
  if (!allowed) return { message: 'Too many attempts. Try again in 15 minutes.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.phone) return { message: 'No phone number linked to your account.' }

  const { error } = await supabase.auth.signInWithOtp({ phone: user.phone })
  if (error) {
    console.error('[sendPasswordChangePhoneOtp]', error.message)
    return { message: 'Could not send OTP. Please try again.' }
  }

  return { success: true, phone: user.phone }
}

export async function sendLoginPhoneOtp(
  _prevState: PhoneOtpSendState,
  formData: FormData
): Promise<PhoneOtpSendState> {
  const ip = await getClientIp()
  const allowed = await checkRateLimit(`phone_otp:${ip}`)
  if (!allowed) {
    return { message: 'Too many attempts. Please try again in 15 minutes.' }
  }

  const raw = String(formData.get('phone') ?? '').replace(/\s/g, '')
  const phone = raw.startsWith('+91') ? raw : `+91${raw}`

  const validated = PhoneSchema.safeParse({ phone })
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({ phone: validated.data.phone })

  if (error) {
    console.error('[sendLoginPhoneOtp]', error.message)
    return { message: 'Could not send OTP. Please try again.' }
  }

  return { success: true, phone: validated.data.phone }
}

export async function sendSignupPhoneOtp(
  _prevState: PhoneOtpSendState,
  formData: FormData
): Promise<PhoneOtpSendState> {
  const ip = await getClientIp()
  const allowed = await checkRateLimit(`phone_otp:${ip}`)
  if (!allowed) {
    return { message: 'Too many attempts. Please try again in 15 minutes.' }
  }

  const raw = String(formData.get('phone') ?? '').replace(/\s/g, '')
  const phone = raw.startsWith('+91') ? raw : `+91${raw}`

  const validated = PhoneSignupSchema.safeParse({
    username: formData.get('username'),
    display_name: formData.get('display_name'),
    phone,
  })
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    phone: validated.data.phone,
    options: { data: { username: validated.data.username, display_name: validated.data.display_name } },
  })

  if (error) {
    console.error('[sendSignupPhoneOtp]', error.message)
    return { message: 'Could not send OTP. Please try again.' }
  }

  return { success: true, phone: validated.data.phone }
}

export async function verifyPhoneOtp(
  _prevState: PhoneOtpVerifyState,
  formData: FormData
): Promise<PhoneOtpVerifyState> {
  const ip = await getClientIp()
  const allowed = await checkRateLimit(`phone_verify:${ip}`)
  if (!allowed) {
    return { message: 'Too many attempts. Please try again in 15 minutes.' }
  }

  const phone = String(formData.get('phone') ?? '').trim()
  const token = String(formData.get('token') ?? '').replace(/\D/g, '')

  const validated = PhoneOtpSchema.safeParse({ phone, token })
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({
    phone: validated.data.phone,
    token: validated.data.token,
    type: 'sms',
  })

  if (error) {
    console.error('[verifyPhoneOtp]', error.message)
    return { message: 'Invalid or expired code. Please try again.' }
  }

  return { success: true }
}

export async function resendVerification(_: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login')

  await supabase.auth.resend({ type: 'signup', email: user.email })
}
