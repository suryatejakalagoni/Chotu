import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { cookies } from 'next/headers'

const SCOPES = 'https://www.googleapis.com/auth/calendar.events'

export async function GET(): Promise<NextResponse> {
  // Must be authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
  }

  // Generate a random state token to prevent CSRF
  const state = crypto.randomBytes(32).toString('hex')

  // Store state in a short-lived HttpOnly cookie
  const cookieStore = await cookies()
  cookieStore.set('google_oauth_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax', // must be lax — strict blocks the redirect-back
    maxAge:   600,   // 10 minutes
    path:     '/',
  })

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope:         SCOPES,
    access_type:   'offline',   // get a refresh token
    prompt:        'consent',   // force consent so we always get refresh_token
    state,
  })

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
