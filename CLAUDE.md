@AGENTS.md

# CHOTU — Project Context for Claude Code

## What is this?
A PWA for ~64 college classmates in Telangana. Features: assignment tracker, exam tracker, expense splitter, community resource hub, voice input. Budget ₹0, 15-day build.

## Stack (locked — do not deviate without asking)
- Next.js 16 App Router + TypeScript strict mode
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + Realtime + Storage)
- Cloudflare R2 for community uploads (P0 - community hub phase)
- Zustand (client state) + TanStack Query (server state)
- react-hook-form + zod
- next-pwa for PWA support
- Hosted on Vercel

## Build Order
- P0 (Days 1–10): setup → auth → DB+RLS → expenses → assignments → exams → splits → community hub → dashboard + 2D landing → deploy
- P1 (Days 11–13): Google Calendar sync → voice input → voice command parser
- P2 (Days 14–15): 3D landing (R3F) → polish → ship

## NON-NEGOTIABLE SECURITY RULES
1. All secrets in `.env` only. `.env` in `.gitignore`. `.env.example` has empty values.
2. Every server input validated with zod. Never concat user input into queries.
3. Supabase Auth only. JWT 15min–1h. Refresh tokens httpOnly cookies. RLS on EVERY table — `user_id = auth.uid()`.
4. Rate limits: auth 5/15min/IP, general 60/min, voice 10/min/user. Return 429 with Retry-After. Use Next.js middleware.
5. Security headers in next.config.ts: CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, HSTS, Referrer-Policy strict-origin-when-cross-origin. Remove X-Powered-By.
6. CORS: whitelist localhost:3000 + chotu.vercel.app only. No `*`.
7. Auth cookies: HttpOnly + Secure + SameSite=Strict.
8. Uploads: validate MIME + extension server-side. 10MB/file, 100MB/user. Rename to UUID. Allowed: PDF, PNG, JPG, DOCX, TXT, MD.
9. Errors: never leak stack traces or DB errors. Generic user-facing messages. Log server-side only.
10. XSS: no `dangerouslySetInnerHTML` without DOMPurify, no `eval`, no `innerHTML` with dynamic content.
11. No tokens, PII, or passwords in URL query params — ever.
12. TypeScript strict mode. Avoid `any`.

## How We Work
- Before any new feature: propose file structure and wait for OK.
- After each feature: run checklist (zod ✓ / rate limit ✓ / RLS ✓ / auth ✓ / no leaks ✓ / no PII in URLs ✓ / TS strict ✓).
- End of each day: deploy gate (Days 10/13/15) + git commit + status check.
- Explain at basic JS/HTML/CSS level. User is not a Next.js/Supabase expert.
- If a step takes >2 hours, flag it and propose a cut.

