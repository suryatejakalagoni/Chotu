import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Log in — CHOTU' }

export default function LoginPage() {
  return (
    <>
      {/*
       * Fraunces heading — matches the landing's feature headings.
       * Yellow marker on "back" ties into the landing's highlight motif.
       * No dangerouslySetInnerHTML — safe static spans only.
       */}
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
        Welcome{' '}
        <span
          style={{
            background: 'linear-gradient(120deg,#ffe27a 0%,#ffd24d 100%)',
            padding: '0 .12em',
            borderRadius: '.15em',
            color: '#1a1a1a',
          }}
        >
          back
        </span>
      </h2>
      <LoginForm />
    </>
  )
}
