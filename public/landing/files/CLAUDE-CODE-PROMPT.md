# PASTE THIS INTO CLAUDE CODE

Before pasting, do these 3 manual steps (one-time, ~2 min):
1. Copy the 7 PNGs from the `public-landing/` folder into your project at `public/landing/`.
2. Drop `BUILD-SPEC.md` somewhere in the repo root (Claude Code will read it).
3. Keep `prototype-reference-v8.html` handy — open it in a browser so you can compare the
   final result to the approved motion.

Then paste everything below into Claude Code:

---

We're adding the approved landing-page hero to CHOTU. It's a scroll-driven "drawer cinema"
animation that already exists as a finished prototype. Your job is to port it faithfully into
this Next.js 16 + TS project as a real React component — NOT to redesign it.

Full instructions and the EXACT tuned motion values are in `BUILD-SPEC.md` in the repo. Read
that file first. The approved reference is `prototype-reference-v8.html` (I'll compare against it).

The 7 assets are already at `public/landing/` (table-closed, table-open, checklist, clock,
wallet, phone, calendar — all transparent PNGs).

HOW WE WORK (per my CLAUDE.md rules):
- BEFORE writing any code: read BUILD-SPEC.md, then propose (a) the exact file paths you'll
  create/edit, (b) which landing route this mounts on, (c) how you'll load the 3 Google fonts
  (next/font preferred), and (d) how Sign in/Sign up will link to my existing /login and /signup.
  Wait for my OK before generating code.
- Use `npm install gsap` (free, GSAP 3.12.x + ScrollTrigger). No other new deps.
- Component is a "use client" component. Build the GSAP timeline in useGSAP (or useEffect with
  proper cleanup / ctx.revert() on unmount). Guard with prefers-reduced-motion.
- Match the per-feature values in BUILD-SPEC.md EXACTLY (baseW, riseY, flyScale, the timeline
  steps, the copy). These were hand-tuned over many iterations — do not "improve" them.
- TS strict, no `any`. Don't touch existing auth/header/community code beyond linking the two
  nav routes.

AFTER building, give me the checklist:
- [ ] Component renders on the landing route
- [ ] All 5 objects rise from the drawer and sit on-screen beside their text (not cut off by header)
- [ ] Phone shows the PDF-share chat overlay only on the Community Hub step
- [ ] Title CHOTU hovers above the table and fades on scroll
- [ ] Sign in → /login, Sign up → /signup work
- [ ] prefers-reduced-motion path works (static, no scrub)
- [ ] TS strict passes, no console errors
- [ ] The 7 PNGs load from /landing/ (no 404s)

Then flag honestly: anything in the spec that didn't translate cleanly to my project structure,
and whether you expect scrub-scroll performance issues on mid-range Android (this is the one
thing I still need to test on a real phone).

Start by reading BUILD-SPEC.md and proposing the file plan. Wait for my OK before code.
