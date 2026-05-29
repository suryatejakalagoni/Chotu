import { z } from 'zod'

const passwordSchema = z
  .string()
  .min(8, { error: 'Password must be at least 8 characters.' })
  .regex(/[a-zA-Z]/, { error: 'Password must contain at least one letter.' })
  .regex(/[0-9]/, { error: 'Password must contain at least one number.' })

export const SignupSchema = z
  .object({
    username: z
      .string()
      .min(3, { error: 'Username must be at least 3 characters.' })
      .max(20, { error: 'Username must be 20 characters or fewer.' })
      .regex(/^[a-zA-Z0-9_]+$/, {
        error: 'Username can only contain letters, numbers, and underscores.',
      })
      .trim(),
    display_name: z
      .string()
      .min(2, { error: 'Display name must be at least 2 characters.' })
      .max(50, { error: 'Display name must be 50 characters or fewer.' })
      .trim(),
    // email and phone are both optional — at least one is required (checked below)
    email: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    password: passwordSchema,
  })
  .superRefine((d, ctx) => {
    if (!d.email && !d.phone) {
      ctx.addIssue({ code: 'custom', message: 'Email or mobile number is required.', path: ['email'] })
    }
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
      ctx.addIssue({ code: 'custom', message: 'Please enter a valid email address.', path: ['email'] })
    }
    if (d.phone && !/^\+91[6-9]\d{9}$/.test(d.phone)) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid 10-digit Indian mobile number.', path: ['phone'] })
    }
  })

// identifier accepts email or phone — action auto-detects
export const LoginSchema = z.object({
  identifier: z.string().min(1, { error: 'Email or mobile number is required.' }).trim(),
  password: z.string().min(1, { error: 'Password is required.' }),
})

export type SignupFormState =
  | {
      errors?: {
        username?: string[]
        display_name?: string[]
        email?: string[]
        phone?: string[]
        password?: string[]
      }
      message?: string
      success?: boolean
      // true when signed up with phone+password
      phoneOnly?: boolean
      phone?: string
      // true when phone confirmations are disabled — account created immediately, no OTP
      confirmed?: boolean
    }
  | undefined

export type LoginFormState =
  | {
      errors?: {
        identifier?: string[]
        password?: string[]
      }
      message?: string
      success?: boolean
    }
  | undefined

export const ForgotPasswordEmailSchema = z.object({
  email: z.email({ error: 'Please enter a valid email address.' }).trim(),
})

export const NewPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { error: 'Password must be at least 8 characters.' })
      .regex(/[a-zA-Z]/, { error: 'Password must contain at least one letter.' })
      .regex(/[0-9]/, { error: 'Password must contain at least one number.' }),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: 'Passwords do not match.',
    path: ['confirm'],
  })

export type ForgotPasswordState =
  | {
      errors?: { email?: string[] }
      message?: string
      success?: boolean
    }
  | undefined

export type UpdatePasswordState =
  | {
      errors?: { password?: string[]; confirm?: string[] }
      message?: string
      success?: boolean
    }
  | undefined

export type VerifyOtpState =
  | {
      message?: string
      locked?: boolean
      success?: boolean
    }
  | undefined

// Indian mobile: +91 followed by 10 digits starting with 6–9
export const PhoneSchema = z.object({
  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, { error: 'Enter a valid 10-digit Indian mobile number.' }),
})

export const PhoneSignupSchema = z.object({
  username: z
    .string()
    .min(3, { error: 'Username must be at least 3 characters.' })
    .max(20, { error: 'Username must be 20 characters or fewer.' })
    .regex(/^[a-zA-Z0-9_]+$/, {
      error: 'Username can only contain letters, numbers, and underscores.',
    })
    .trim(),
  display_name: z
    .string()
    .min(2, { error: 'Display name must be at least 2 characters.' })
    .max(50, { error: 'Display name must be 50 characters or fewer.' })
    .trim(),
  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, { error: 'Enter a valid 10-digit Indian mobile number.' }),
})

export const PhoneOtpSchema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/),
  token: z
    .string()
    .regex(/^\d{6}$/, { error: 'Enter the 6-digit code sent to your phone.' }),
})

export type PhoneOtpSendState =
  | {
      errors?: {
        phone?: string[]
        username?: string[]
        display_name?: string[]
      }
      message?: string
      success?: boolean
      phone?: string
    }
  | undefined

export type PhoneOtpVerifyState =
  | {
      errors?: { token?: string[] }
      message?: string
      success?: boolean
    }
  | undefined
