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

---

## Changelog

### 2026-06-03 — Migration repair: remote baseline generated (Prompt B)

All 29 prod tables were hand-built in the SQL Editor — no migration history existed
(`supabase_migrations.schema_migrations` does not exist on the project). Seven existing
migration files were patches on a phantom base; they are archived, not deleted.
A machine-reconstructed baseline and a cross-schema supplement are now the source of truth.

#### Method
`supabase db dump` requires Docker Desktop (unavailable on this machine), so the baseline
was reconstructed from `pg_catalog` queries via the Supabase MCP (Option B). The local
reset (`supabase db reset`) and local↔remote diff are **BLOCKED** until Docker Desktop is
installed. Once available: `npx supabase db reset --local` should complete cleanly.

#### Files created
- `supabase/migrations/20260603000000_remote_baseline.sql` — full public schema DDL:
  6 enums, 6 functions (2 orphaned functions omitted, see note), 29 tables in FK order,
  65 indexes, RLS ENABLE on all 29 tables, ~90 RLS policies, 13 triggers.
- `supabase/migrations/20260603000001_baseline_supplement.sql` — cross-schema objects:
  3 storage buckets (idempotent ON CONFLICT DO NOTHING), 10 storage.objects RLS policies
  (DROP IF EXISTS + CREATE), pg_cron job `community-post-expiry` (idempotent via
  `cron.unschedule` + `cron.schedule`), `on_auth_user_created` trigger on `auth.users`.
- `supabase/seed.sql` — 18 global categories (13 expense + 5 income, UUIDs match prod,
  ON CONFLICT DO NOTHING).

#### Files archived (not deleted — git history preserved)
`supabase/migrations_archive/`: all 7 previous patch files moved here.

#### Local reset / diff status
- **SKIPPED** — Docker Desktop is not installed on this machine.
- `npx supabase db reset --local` fails with:
  `error during connect: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`
- Once Docker is installed: run reset, then
  `npx supabase db diff --linked --schema public` to verify empty diff.

#### Pre-existing bugs found (not fixed here — need separate investigation)
1. **Orphaned functions**: `is_split_group_member` and `is_split_share_owner` reference
   `user_id` on `split_group_members` and `split_shares` respectively — both are dropped
   columns (attnum 3, not present in the live schema). These functions are not used by
   any RLS policy, but they exist in prod and would fail at runtime if called. Omitted
   from the baseline with a comment.
2. **Stale TypeScript types**: `exams` table has a `location` column in the DB.
   App code (`ExamCard`, `ExamForm`) and `database.types.ts` reference `venue` and
   `exam_type` which do not exist in the DB. Run
   `npx supabase gen types typescript --project-id huhgsomogdujlsqnvqnu --schema public > src/types/database.types.ts`
   to regenerate. This will likely break existing exam UI code that references `.venue`.

#### Prod migration history reconciliation
Still deferred to the first real `db push` (e.g. for bunk_* tables). At that point
Supabase will create `supabase_migrations.schema_migrations` and record the baseline
timestamp as the starting point. No special action needed now.

---

### 2026-06-03 — Bunk Calculator: pure calculation engine (Prompt 2 of 4)

Pure, dependency-free TypeScript engine that auto-counts classes from the
timetable + calendar. No Supabase / React / UI / fetching in this layer.

#### Files created
- `src/lib/bunk/calc.ts` — the engine. Native `Date` only (no date-fns/dayjs).
- `src/lib/bunk/calc.test.ts` — 8 `node:test` unit tests.

#### Public API (`src/lib/bunk/calc.ts`)
- Types: `Weekday`, `Slot`, `MissedEntry`, `SemesterConfig`, `BunkInput`, `BunkResult`.
- `computeBunk(input: BunkInput): BunkResult` — pure function, no I/O, no
  `Date.now()`. `referenceDate` ('today') is passed in by the caller.

#### Boundary convention
- Single constant `INCLUDE_TODAY_IN_HELD = true`: `referenceDate` counts as
  already HELD; `remaining` starts the day AFTER it. Flip the constant to change.
- A "working day" = date in `[start, end]`, whose weekday has ≥1 slot, not a holiday.
- `heldSoFar` = working slots in `[start, min(reference, end)]`.
- `remainingToHorizon` = working slots in `(reference, min(horizon, end)]`
  (horizon defaults to `semester.end_date`).
- All date math is UTC-based (`Date.UTC` + 'YYYY-MM-DD' string compares) to avoid
  local-timezone / DST off-by-one bugs.
- `missedCount`: only working days inside the held range; identical
  `(date, slot_id)` pairs de-duplicated; per-date total capped at slots scheduled
  that weekday; holidays / non-scheduled weekdays / out-of-range ignored.
- `maxBunk(T) = floor(attendedSoFar + remaining − (T/100)·total)`; RAW value drives
  status, clamped `0..remaining` for the reported figures.
- CVR rule: `required_pct = 75` (safe), `floor_pct = 65` (below = detention).
  status: raw `maxBunk(required) ≥ 0` → `safe`; else `projectedPctIfAttendAll ≥
  floor` → `condonation`; else `detention`. Engine rounds nothing; callers format.

#### Test runner
- No unit-test runner existed (only Playwright e2e). Added zero-package
  `node:test` + `node:assert`. Node 24 strips TS types natively.
- New script: `npm run test:unit` → `node --test "src/lib/**/*.test.ts"`.
- `tsconfig.json`: added `allowImportingTsExtensions: true` (valid under
  `noEmit`) so the test's required `.ts`-extension import type-checks cleanly.

#### Verification
- `npm run test:unit` → **8 passed, 0 failed** (anchor 83.33%/safe with
  maxBunkSafe=15, maxBunkFloor=25; partial-day; whole-day cap; holiday reduces
  held 60→55; detention; condonation; reference-before-start; horizon-before-reference).
- `tsc --noEmit` → **0 errors**.

---

### 2026-05-24 — GSAP scroll lag fix: title centering handed to GSAP (commit dc78b2e)

**The rule**: Never put `transform` in a CSS class on an element that GSAP animates.
When GSAP can't find an inline `style.transform`, it falls back to `getComputedStyle()`
on every frame it composes transforms — that's a forced layout reflow per scroll event = jank.
Also, `getComputedStyle()` returns a pixel matrix (percentages resolved), losing the viewport-
independent nature of `translate(-50%,-50%)`, causing off-centre positioning.

Fix: Removed `transform: translate(-50%,-50%)` from `.lc-title` CSS class.
Added `xPercent: -50, yPercent: -50` to the `gsap.set(title, {...})` call (both animated
and reduced-motion paths). GSAP now owns the centering as percentages, reads only `_gsap`
cache per frame, zero `getComputedStyle()` calls during animation.

`.lc-cta` keeps its CSS transform (GSAP never animates transforms on it — only opacity).

---

### 2026-05-24 — Hydration fix: all static inline styles moved to CSS classes (commit 8c3b809)

Root cause: React 19's inline-style serialiser emits kebab-case property names and
normalised value strings (`rgb(255,255,255)`, spaces in `translate(-50%, -50%)`)
during SSR, while the client hydrator expects camelCase / `#hex` / compact values.
This caused a hydration mismatch and React scrapped the entire server tree on every
page load, breaking GSAP refs.

Fix: moved every large static inline-style object on affected elements to plain CSS
classes in `globals.css` (the project's existing pattern for landing-specific CSS).

**New CSS classes added to `src/app/globals.css`:**
`.lc-site-header`, `.lc-site-brand`, `.lc-site-signup` — site header
`.lc-stage`, `.lc-title`, `.lc-table-wrap`, `.lc-table-img`, `.lc-obj-wrap` — scroll scene
`.lc-cta`, `.lc-cta-row`, `.lc-cta-heading`, `.lc-cta-tagline`, `.lc-cta-actions` — CTA section
`.lc-btn-primary`, `.lc-btn-outline` — CTA buttons

**Rule going forward:** never add large inline style objects to elements that are
SSR'd (`'use client'` components ARE SSR'd). Use CSS classes for all static styles.
Only GSAP-managed values (opacity, transform during animation) may stay inline — and
only when GSAP needs to read them as its starting state.

#### Files changed
- `src/app/globals.css` — 15 new CSS classes added
- `src/components/site-header.tsx` — header/brand/signup now use CSS classes
- `src/components/landing/ScrollScene.tsx` — stage/title/table/objWrap/CTA now use CSS classes

---

### 2026-05-22 — Landing page finalized; nav wired; public pages added

**Landing page is now considered finalized. Do not touch the drawer-cinema GSAP
scroll animation, the GSAP timeline values, or any code in
`components/landing/ScrollScene.tsx` without explicit instruction.**

#### Files created
- `src/components/site-header.tsx` — shared frosted-glass header rendered on
  the landing page and all three new public routes. Uses `usePathname()` to
  highlight the active nav link. All nav items use Next.js `<Link>`.
- `src/app/features/page.tsx` — public /features route; describes all five
  CHOTU tools (Assignment Tracker, Exam Tracker, Expense Tracker, Community
  Hub, Calendar Sync) with real placeholder copy.
- `src/app/about/page.tsx` — public /about route; explains what CHOTU is,
  who it is for, how it was built.
- `src/app/help/page.tsx` — public /help route; eight FAQ entries + "Still
  stuck?" CTA card + contact email (suryatejakalagoni@gmail.com) at the
  bottom.

#### Files changed
- `src/app/page.tsx` — imports `SiteHeader` from `site-header.tsx` (was
  importing the old `components/landing/Header.tsx`).
- `src/components/landing/ScrollScene.tsx` — removed `position: relative`
  from the 900 vh scroll spacer and bumped stage to `zIndex: 1` so the CTA
  buttons (Get started → /signup, Sign in → /login) are not blocked by the
  spacer in the hit-testing stacking order.
- `CLAUDE.md` — this entry.

#### Routing summary
| Nav item | Destination |
|---|---|
| Features | /features |
| About | /about |
| Help | /help |
| Sign in (header + hero outline button) | /login |
| Sign up (header pill) | /signup |
| Get started (hero primary button) | /signup |

#### Dead code (safe to delete, no errors)
- `src/components/landing/Header.tsx` — superseded by `site-header.tsx`.

---

### 2026-05-22 — Auth pages restyled to match landing (Phase 1)

Auth pages now share the landing's warm-oak palette, type system, and visual
language. No auth logic, validation, server actions, or API calls were touched.

#### Files created
- `src/components/auth/AuthSceneClient.tsx` — Client Component that owns the
  entire auth visual layer: warm gradient background, shared SiteHeader,
  GSAP-animated PNG object (checklist on /signup, clock on /login), frosted
  form card, and the A/B/C motion-style toggle.

#### Files changed
- `src/app/(auth)/layout.tsx` — now a thin server-component shell that just
  renders `<AuthSceneClient>{children}</AuthSceneClient>`. All visual logic
  moved to AuthSceneClient.
- `src/app/(auth)/login/page.tsx` — heading changed to "Welcome back" with
  yellow marker on "back"; styled with Fraunces + `#16181d`.
- `src/app/(auth)/signup/page.tsx` — heading "Create your account" with
  yellow marker on "account"; same type treatment.
- `src/components/auth/LoginForm.tsx` — restyled to warm palette:
  `#eceef1` inputs, `rgba(0,0,0,0.2)` borders, `#16181d` text,
  `#1a1a1a` primary button, `#dc2626` errors. No logic changes.
- `src/components/auth/SignupForm.tsx` — same restyle as LoginForm.
- `src/app/globals.css` — added `.auth-obj` (hides PNG on ≤768 px) and
  `.auth-motion-toggle` (hides toggle when prefers-reduced-motion is set).

#### Motion styles (A/B/C toggle, bottom-right corner)
- **A — Lift & hold** (default): power2.out rise to −22 px, hold 1.4 s,
  power1.in settle, brief rest. Gravity-aware, breath-like.
- **B — Float drift**: multi-axis wandering (x, y, rotation), sine easing,
  ~16 s full loop. Organic, buoyant.
- **C — Parallax sway**: pure horizontal pendulum ±14 px + matching tilt,
  6.5 s yoyo. Architectural, calm.

Toggle disappears on `prefers-reduced-motion`. PNG hidden on mobile.
Animation pauses on input focus (Android Chrome perf). `tsc --noEmit`: 0 errors.

