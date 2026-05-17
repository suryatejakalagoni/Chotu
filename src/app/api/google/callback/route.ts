import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { oauthCallbackSchema } from '@/lib/validations/google'
import { storeGoogleTokens } from '@/lib/google-auth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl

  // Validate incoming params with zod
  const parsed = oauthCallbackSchema.safeParse({
    code:  searchParams.get('code'),
    state: searchParams.get('state'),
  })

  if (!parsed.success) {
    console.error('[google/callback] invalid params:', parsed.error.issues)
    return NextResponse.redirect(`${APP_URL}/settings?google_error=invalid_callback`)
  }

  const { code, state } = parsed.data

  // CSRF check — compare state to cookie
  const cookieStore = await cookies()
  const storedState = cookieStore.get('google_oauth_state')?.value
  cookieStore.delete('google_oauth_state')

  if (!storedState || storedState !== state) {
    console.error('[google/callback] state mismatch — possible CSRF')
    return NextResponse.redirect(`${APP_URL}/settings?google_error=state_mismatch`)
  }

  // Must be authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login`)
  }

  // Exchange auth code for tokens
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
        grant_type:    'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text()
      // Deliberately not logging body — may contain sensitive tokens
      console.error('[google/callback] token exchange failed, status:', tokenRes.status)
      return NextResponse.redirect(`${APP_URL}/settings?google_error=token_exchange_failed`)
    }

    const tokenData = await tokenRes.json()

    if (!tokenData.refresh_token) {
      // This happens if user already connected before and we didn't force consent
      // prompt=consent in connect route should prevent this, but guard anyway
      console.error('[google/callback] no refresh_token in response')
      return NextResponse.redirect(`${APP_URL}/settings?google_error=no_refresh_token`)
    }

    await storeGoogleTokens(user.id, {
      access_token:  tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at:    new Date(Date.now() + tokenData.expires_in * 1000),
    })

    return NextResponse.redirect(`${APP_URL}/settings?google_connected=1`)
  } catch (err) {
    console.error('[google/callback] unexpected error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.redirect(`${APP_URL}/settings?google_error=unexpected`)
  }
}
