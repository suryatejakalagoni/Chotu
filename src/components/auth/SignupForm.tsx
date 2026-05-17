'use client'

import { useActionState } from 'react'
import { signUp, signInWithGoogle } from '@/lib/actions/auth'
import { type SignupFormState } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'

export default function SignupForm() {
  const [state, action, pending] = useActionState<SignupFormState, FormData>(
    signUp,
    undefined
  )

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        {state?.message && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.message}
          </div>
        )}

        <div>
          <label
            htmlFor="username"
            className="block text-sm font-medium text-gray-700"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
          {state?.errors?.username?.map((e) => (
            <p key={e} className="mt-1 text-xs text-red-600">
              {e}
            </p>
          ))}
        </div>

        <div>
          <label
            htmlFor="display_name"
            className="block text-sm font-medium text-gray-700"
          >
            Display Name
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
          {state?.errors?.display_name?.map((e) => (
            <p key={e} className="mt-1 text-xs text-red-600">
              {e}
            </p>
          ))}
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
          {state?.errors?.email?.map((e) => (
            <p key={e} className="mt-1 text-xs text-red-600">
              {e}
            </p>
          ))}
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
          {state?.errors?.password?.map((e) => (
            <p key={e} className="mt-1 text-xs text-red-600">
              {e}
            </p>
          ))}
        </div>

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-400">or</span>
        </div>
      </div>

      <form action={signInWithGoogle}>
        <Button type="submit" variant="outline" className="w-full">
          Continue with Google
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <a href="/login" className="font-medium text-blue-600 hover:underline">
          Log in
        </a>
      </p>
    </div>
  )
}
