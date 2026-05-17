import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Log in — CHOTU' }

export default function LoginPage() {
  return (
    <>
      <h2 className="mb-6 text-xl font-semibold" style={{ color: '#F5F5F0' }}>
        Log in
      </h2>
      <LoginForm />
    </>
  )
}
