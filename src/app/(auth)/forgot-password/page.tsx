import type { Metadata } from 'next'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = { title: 'Reset password — CHOTU' }

export default function ForgotPasswordPage() {
  return (
    <>
      <h2
        style={{
          fontFamily: "var(--font-fraunces),'Fraunces',serif",
          fontSize: 'clamp(22px,3.5vw,28px)',
          fontWeight: 600,
          lineHeight: 1.1,
          color: '#16181d',
          margin: '0 0 1.5rem',
        }}
      >
        Reset your{' '}
        <span
          style={{
            background: 'linear-gradient(120deg,#ffe27a 0%,#ffd24d 100%)',
            padding: '0 .12em',
            borderRadius: '.15em',
            color: '#1a1a1a',
          }}
        >
          password
        </span>
      </h2>
      <ForgotPasswordForm />
    </>
  )
}
