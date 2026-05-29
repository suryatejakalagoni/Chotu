import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const verifiedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Email verified — CHOTU</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;
         background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         padding:1rem;text-align:center}
    .card{background:#1a1d27;border:1px solid rgba(255,255,255,0.08);border-radius:1rem;
          padding:2.5rem 2rem;max-width:360px;width:100%}
    .icon{width:56px;height:56px;border-radius:50%;background:#1e3a2f;
          display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem}
    .icon svg{color:#4ade80}
    h1{font-size:1.25rem;font-weight:700;color:#f5f5f0;margin-bottom:.625rem}
    p{font-size:.875rem;color:#9ca3af;line-height:1.5;margin-bottom:1.5rem}
    a{display:inline-block;background:#F5A623;color:#1a1a1a;font-weight:600;
      font-size:.875rem;padding:.625rem 1.5rem;border-radius:.5rem;text-decoration:none}
    a:hover{opacity:.85}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">
      <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
    </div>
    <h1>Email verified!</h1>
    <p>Your account is ready. You can close this page or tap below to open CHOTU.</p>
    <a href="/login">Open CHOTU</a>
  </div>
</body>
</html>`

const errorHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verification failed — CHOTU</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;
         background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         padding:1rem;text-align:center}
    .card{background:#1a1d27;border:1px solid rgba(255,255,255,0.08);border-radius:1rem;
          padding:2.5rem 2rem;max-width:360px;width:100%}
    h1{font-size:1.25rem;font-weight:700;color:#f87171;margin-bottom:.625rem}
    p{font-size:.875rem;color:#9ca3af;line-height:1.5;margin-bottom:1.5rem}
    a{display:inline-block;background:#F5A623;color:#1a1a1a;font-weight:600;
      font-size:.875rem;padding:.625rem 1.5rem;border-radius:.5rem;text-decoration:none}
  </style>
</head>
<body>
  <div class="card">
    <h1>Link expired or invalid</h1>
    <p>This verification link has expired or already been used. Please log in and request a new one.</p>
    <a href="/login">Go to login</a>
  </div>
</body>
</html>`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return new NextResponse(verifiedHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }
    console.error('[auth/callback]', error.message)
  }

  return new NextResponse(errorHtml, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
