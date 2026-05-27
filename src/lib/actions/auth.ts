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
  type SignupFormState,
  type LoginFormState,
  type ForgotPasswordState,
  type UpdatePasswordState,
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

  const validated = SignupSchema.safeParse({
    username: formData.get('username'),
    display_name: formData.get('display_name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { username, display_name, email, password } = validated.data
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, display_name } },
  })

  if (error) {
    console.error('[signUp]', error.message)
    return { message: 'Could not create account. Please try again.' }
  }

  return { success: true }
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
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { email, password } = validated.data

  const locked = await isAccountLocked(email)
  if (locked) {
    return { message: 'Too many failed attempts. Please try again in 15 minutes.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[logIn]', error.message)
    await recordLoginAttempt(email, ip)
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
    // Neutral message — same as success to prevent timing enumeration
    return { success: true }
  }

  const validated = ForgotPasswordEmailSchema.safeParse({
    email: formData.get('email'),
  })

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors }
  }

  const { email } = validated.data
  const supabase = await createClient()

  // Call regardless of whether account exists — never leak account existence.
  await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  })

  return { success: true }
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

export async function resendVerification(_: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) redirect('/login')

  await supabase.auth.resend({ type: 'signup', email: user.email })
}
