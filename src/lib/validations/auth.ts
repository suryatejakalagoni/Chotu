import { z } from 'zod'

export const SignupSchema = z.object({
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
  email: z.email({ error: 'Please enter a valid email address.' }).trim(),
  password: z
    .string()
    .min(8, { error: 'Password must be at least 8 characters.' })
    .regex(/[a-zA-Z]/, { error: 'Password must contain at least one letter.' })
    .regex(/[0-9]/, { error: 'Password must contain at least one number.' }),
})

export const LoginSchema = z.object({
  email: z.email({ error: 'Please enter a valid email address.' }).trim(),
  password: z.string().min(1, { error: 'Password is required.' }),
})

export type SignupFormState =
  | {
      errors?: {
        username?: string[]
        display_name?: string[]
        email?: string[]
        password?: string[]
      }
      message?: string
      success?: boolean
    }
  | undefined

export type LoginFormState =
  | {
      errors?: {
        email?: string[]
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

export const PhoneOtpSchema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/),
  token: z
    .string()
    .regex(/^\d{6}$/, { error: 'Enter the 6-digit code sent to your phone.' }),
})

export type PhoneOtpSendState =
  | {
      errors?: { phone?: string[] }
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
