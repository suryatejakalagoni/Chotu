# CHOTU — Build Spec: Port the drawer-cinema hero into Next.js

> Paste this into **Claude Code** inside the CHOTU project. It has all the tuned values
> from the working prototype. Claude Code can see your real file structure — let it pick
> exact paths. This spec tells it WHAT to build and the EXACT numbers, not where your files live.

---

## What this is
Port a working scroll-driven landing-page hero (currently a standalone prototype HTML file)
into the Next.js 16 + TS project as a real React component. The prototype is approved and
final — do not redesign it, just translate it faithfully to React + real assets.

## Prerequisites / install
- `npm install gsap` (free; GSAP 3.12.x with ScrollTrigger). No other new deps.
- Copy the 7 transparent PNGs into `/public/landing/`:
  `table-closed.png, table-open.png, checklist.png, clock.png, wallet.png, phone.png, calendar.png`
  (These are the clean cut assets from the chat — already verified RGBA, no halos.
  Use them as real files, NOT base64. They are small, PWA-cache friendly.)

## Component to create
A client component `ScrollScene` (Claude Code: pick the right path, e.g.
`/components/landing/ScrollScene.tsx`; mark `"use client"`). Render it on the landing route.

### Structure (translate prototype DOM → JSX)
- A fixed full-viewport `#stage` with the light gradient background:
  `linear-gradient(180deg,#fff 0%,#fff 45%,#eceef1 100%)`, `perspective: 1100px`.
- A tall scroll spacer (`height: 900vh`) that drives the scroll.
- Title "CHOTU" (Clash Display font) hovering mid-upper screen, gentle ±12° rotateY sway,
  fades out as the first object appears.
- A wooden table pinned to the lower screen, built from TWO stacked `<img>` (table-closed
  and table-open) cross-faded to fake the drawer opening.
- One reused `objectWrap` (`<img>` swapped per feature) that rises from the drawer.
- A phone-chat overlay (JSX, shown only on the phone feature) — see below.
- Feature text block (Fraunces serif title with a yellow highlight span + Space Grotesk desc).
- An ending CTA over the empty table.

### Fonts (Google Fonts, free)
- Title + brand: **Clash Display** (700)
- Feature titles: **Fraunces** (600)
- Body/desc + nav: **Space Grotesk**
Load via `next/font` (preferred in Next 16) or a `<link>` in the layout head.

### Header (transparent, sticky)
Brand "CHOTU" left; nav right: Features / About / Help, then **Sign in** → `/login`,
**Sign up** (pill) → `/signup`. Frosted glass: `background: rgba(255,255,255,0.18)`,
`backdrop-filter: blur(10px) saturate(120%)`.

---

## THE MOTION (exact tuned values — do not change these)

Use GSAP timeline + ScrollTrigger, `scrub: 0.6`, pinned to the stage across the 900vh spacer.
Wrap in `useGSAP` or a `useEffect` with proper cleanup (`ctx.revert()` on unmount).
Guard with `prefers-reduced-motion` (skip the scrub animation, just show objects statically).

### Per-feature data (FEATURES array, in this exact order):
| order | img | baseW (vw) | riseY | flyScale | isPhone | title | highlight word |
|---|---|---|---|---|---|---|---|
| 1 | checklist | 18 | -55 | 1.8 | no | Assignment Tracker | Tracker |
| 2 | clock | 15 | -55 | 1.8 | no | Exam Tracker | Tracker |
| 3 | wallet | 24 | -60 | 1.7 | no | Expenses Tracked | Tracked |
| 4 | phone | 12 | -22 | 1.7 | yes | Community Hub | Hub |
| 5 | calendar | 16 | -52 | 1.8 | no | Calendar Sync | Sync |

- `baseW` → object width: `min({baseW}vw, {baseW*14}px)`.
- objectWrap anchor: `position:absolute; left:40%; bottom:30%; transform:translateX(-50%)`,
  `z-index:4` (BEHIND the table front which is `z-index:5`, so it looks clipped emerging
  from the drawer), `transform-style:preserve-3d`.

### Feature copy (final, personal-use framing):
1. Assignment **Tracker** — "Every deadline in one place. Always know exactly what is due and when."
2. Exam **Tracker** — "Countdown to every paper. Never get caught off guard again."
3. Expenses **Tracked** — "See where your money goes. Track every spend without the awkward maths."
4. Community **Hub** — "Share and upload notes, files and PDFs — anonymously if you want to."
5. Calendar **Sync** — "Connects straight to your phone's Google Calendar. Always in sync."

Ending CTA: heading "CHOTU", line "Your study life, organised. One quiet place for everything.",
buttons Get started → `/signup`, Sign in → `/login`.

### Per-feature timeline (each feature is a sub-timeline added to a master, in order):
1. Drawer opens: table-closed fades to 0, table-open fades to 1 (0.4s each, overlap).
2. Object emerges from cavity: `fromTo` from `{opacity:0, scale:.4, yPercent:25, xPercent:-50, z:0}`
   to `{opacity:1, scale:.7, yPercent: riseY*0.55, duration:1.0, ease:'power2.out'}`.
   (Emerge endpoint = 55% of this object's riseY → guarantees a continuous rise, no reversal.)
3. Drawer closes WHILE object keeps rising (overlap): table-open→0, table-closed→1.
4. Rise to focus: `to {yPercent: riseY, scale:1, duration:.8, ease:'power2.out'}`.
   Feature text fades in beside it: `fromTo {opacity:0,x:30}→{opacity:1,x:0,duration:.5}`.
5. Hold 0.5s.
6. Text out (`{opacity:0,x:-20,duration:.4}`), then MOTION B — grow moderately toward viewer:
   `to {z:260, scale: flyScale, yPercent: riseY+35, opacity:0, duration:1.0, ease:'power2.in'}`.
   (Subtle ~1.7–1.8× grow with gentle downward drift, then fade. NOT a big fly-past.)
7. After all 5: CTA fades in over the empty table.

### Phone-chat overlay (feature 4 only)
Absolutely-positioned div inside objectWrap, over the phone screen:
`top:5%; left:8%; width:84%; height:85%; border-radius:9%/4.5%; overflow:hidden; background:#0b141a`.
WhatsApp-style: header "Batch Group" (or rename to a personal group), then bubbles:
incoming "Bro can you share the DBMS notes PDF?", outgoing "Yeah one sec", and a PDF
attachment bubble "DBMS_Unit3.pdf". Font sizes in `em`/`%` so they scale with the phone as it grows.
Show only when the current feature `isPhone` is true.

---

## Security / project rules (still apply)
- No secrets in this component (none needed — it's static + scroll).
- Sign in / Sign up are plain `<Link>`s to existing `/login` `/signup` routes — do NOT build
  auth here.
- Keep TS strict, no `any`.
- The 7 PNGs are static public assets — fine to cache in the PWA precache (tiny).

## Performance (do this, it matters for the 64 budget-Android users)
- ScrollTrigger scrub on transforms only (translate/scale/opacity) — already the case.
- Add `will-change: transform, opacity` on objectWrap and title (already in prototype CSS).
- Lazy-mount: the hero is above the fold, so it loads first — keep the 7 PNGs optimized
  (run them through next/image OR pre-compress; they're already small).
- Target: no scrub stutter on a mid-range Android Chrome. **Test on a real phone before shipping**
  — this is the one untested risk. If it stutters, reduce `scrub` smoothing or simplify the
  per-frame work.

## Reference
The approved prototype (all values match this spec) is the standalone file
`chotu-drawer-prototype-v8.html`. Open it to see the exact intended motion before porting.
