import type { Metadata } from 'next'
import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = { title: 'Sign up — CHOTU' }

export default function SignupPage() {
  return (
    <>
      <h2 className="mb-6 text-xl font-semibold text-gray-900">
        Create your account
      </h2>
      <SignupForm />
    </>
  )
}
