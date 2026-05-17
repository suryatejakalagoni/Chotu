'use client'

import { useActionState } from 'react'
import { logIn, signInWithGoogle } from '@/lib/actions/auth'
import { type LoginFormState } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginFormState, FormData>(
    logIn,
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
            autoComplete="current-password"
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
          {pending ? 'Signing in…' : 'Sign in'}
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
        Don&apos;t have an account?{' '}
        <a href="/signup" className="font-medium text-blue-600 hover:underline">
          Sign up
        </a>
      </p>
    </div>
  )
}
