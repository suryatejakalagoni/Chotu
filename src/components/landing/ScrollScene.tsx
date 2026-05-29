'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import LandingOwl from './LandingOwl'

// useLayoutEffect fires synchronously before paint on the client.
// useEffect is used as the fallback during SSR (where layout effects don't run),
// which is safe because the server never paints anyway.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

// ── Feature data ──────────────────────────────────────────────────
interface Feature {
  readonly img: string
  readonly baseW: number   // vw unit; width = min(baseW vw, baseW*14 px)
  readonly riseY: number   // yPercent at focus point (negative = up)
  readonly flyScale: number
  readonly isPhone: boolean
  readonly title: string
  readonly highlight: string // word inside title that gets the yellow mark
  readonly desc: string
}

const FEATURES: readonly Feature[] = [
  {
    img: '/landing/checklist.png',
    baseW: 18,
    riseY: -55,
    flyScale: 1.8,
    isPhone: false,
    title: 'Assignment Tracker',
    highlight: 'Tracker',
    desc: 'Every deadline in one place. Always know exactly what is due and when.',
  },
  {
    img: '/landing/clock.png',
    baseW: 15,
    riseY: -55,
    flyScale: 1.8,
    isPhone: false,
    title: 'Exam Tracker',
    highlight: 'Tracker',
    desc: 'Countdown to every paper. Never get caught off guard again.',
  },
  {
    img: '/landing/wallet.png',
    baseW: 24,
    riseY: -60,
    flyScale: 1.7,
    isPhone: false,
    title: 'Expenses Tracked',
    highlight: 'Tracked',
    desc: 'See where your money goes. Track every spend without the awkward maths.',
  },
  {
    img: '/landing/phone.png',
    baseW: 12,
    riseY: -22,
    flyScale: 1.7,
    isPhone: true,
    title: 'Community Hub',
    highlight: 'Hub',
    desc: 'Share and upload notes, files and PDFs — anonymously if you want to.',
  },
  {
    img: '/landing/calendar.png',
    baseW: 16,
    riseY: -52,
    flyScale: 1.8,
    isPhone: false,
    title: 'Calendar Sync',
    highlight: 'Sync',
    desc: "Connects straight to your phone's Google Calendar. Always in sync.",
  },
]

// ── Highlight helper (no user input — XSS-safe) ───────────────────
function buildTitleHTML(title: string, highlight: string): string {
  const idx = title.indexOf(highlight)
  if (idx === -1) return title
  const before = title.slice(0, idx)
  const after = title.slice(idx + highlight.length)
  return (
    before +
    `<span style="background:linear-gradient(120deg,#ffe27a 0%,#ffd24d 100%);` +
    `padding:0 .12em;border-radius:.15em;color:#1a1a1a">${highlight}</span>` +
    after
  )
}

// ── Component ─────────────────────────────────────────────────────
export default function ScrollScene() {
  const scrollRef    = useRef<HTMLDivElement>(null)
  const stageRef     = useRef<HTMLDivElement>(null)   // fixed stage — used for img query
  const titleRef     = useRef<HTMLDivElement>(null)
  const tClosedRef   = useRef<HTMLImageElement>(null)
  const tOpenRef     = useRef<HTMLImageElement>(null)
  const objWrapRef   = useRef<HTMLDivElement>(null)
  const objImgRef    = useRef<HTMLImageElement>(null)
  const phoneChatRef = useRef<HTMLDivElement>(null)
  const featureRef   = useRef<HTMLDivElement>(null)
  const fTitleRef    = useRef<HTMLHeadingElement>(null)
  const fDescRef     = useRef<HTMLParagraphElement>(null)
  const ctaRef       = useRef<HTMLDivElement>(null)
  // Separate ref for the owl entrance — GSAP animates y here;
  // the CSS float loop runs on the inner .landing-owl-wrap so no conflict.
  const owlRiseRef   = useRef<HTMLDivElement>(null)

  // ── Phase 1: apply initial GSAP states synchronously before first paint ──
  //
  // useEffect fires AFTER paint; any gsap.set calls there let elements flash
  // at their natural (unstyled) size for one frame.  useLayoutEffect fires
  // synchronously after DOM insertion but before the browser paints, so the
  // title centering (xPercent/yPercent) and all hidden-by-default opacities
  // are already correct on frame 0.  This eliminates the oversized title and
  // stray text fragments visible on a cold first load.
  useIsomorphicLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const title   = titleRef.current
    const tClosed = tClosedRef.current
    const tOpen   = tOpenRef.current
    const objWrap = objWrapRef.current
    const feature = featureRef.current
    const cta     = ctaRef.current
    const owlRise = owlRiseRef.current

    if (!title || !tClosed || !tOpen || !objWrap || !feature || !cta || !owlRise) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // .landing-feature centering: GSAP must own the centering transform so that
    // the fromTo { x } animation never conflicts with a CSS transform on the same
    // axis (see CLAUDE.md 2026-05-24 entry and the 2026-05-27 clipping fix).
    //
    // Desktop: element is anchored top:50% left:58% — we center vertically via
    //   yPercent:-50 (translateY(-50% of own height)). x-animation is horizontal
    //   only → no axis conflict.
    //
    // Mobile ≤600px: element is anchored left:50% bottom:14% — we center
    //   horizontally via xPercent:-50 (translateX(-50% of own width)). The
    //   fromTo also animates x, but GSAP composes xPercent + x additively:
    //   translateX(-50%) translateX(30px) → slides in while staying centered.
    //   No axis conflict, no overflow, no clip.
    const isMobile = window.innerWidth <= 640
    const featureCenterProps = isMobile
      ? { xPercent: -50, yPercent: 0 }
      : { xPercent: 0,   yPercent: -50 }

    if (reduced) {
      const f = FEATURES[0]
      const riseY0 = isMobile ? f.riseY * 2.5 : f.riseY
      // xPercent/yPercent: GSAP owns the centering as percentages — never in CSS
      // (see CLAUDE.md 2026-05-24 entry) so GSAP reads its own _gsap cache only.
      gsap.set(title,   { xPercent: -50, yPercent: -50, opacity: 1 })
      gsap.set(objWrap, { opacity: 1, scale: 1, xPercent: -50, yPercent: riseY0 })
      gsap.set(feature, { opacity: 1, ...featureCenterProps })
      gsap.set(tClosed, { opacity: 1 })
      gsap.set(tOpen,   { opacity: 0 })
      gsap.set(cta,     { opacity: 0 })
      gsap.set(owlRise, { y: 0 })
    } else {
      gsap.set(title,   { xPercent: -50, yPercent: -50, opacity: 1 })
      gsap.set(objWrap, { opacity: 0 })
      gsap.set(feature, { opacity: 0, ...featureCenterProps })
      gsap.set(cta,     { opacity: 0 })
      gsap.set(tClosed, { opacity: 1 })
      gsap.set(tOpen,   { opacity: 0 })
      // Owl starts 60 px below its resting position; rises as CTA fades in.
      gsap.set(owlRise, { y: 60 })
    }
  }, [])

  // ── Preload all feature images so setObject swaps are instant on production ─
  // On localhost images are served from the local fs (instant). On Vercel CDN
  // the first visit fetches each PNG over the network. Without preloading,
  // the GSAP setObject callback swaps img.src before the new image has loaded,
  // causing a blank frame that reads as a hard cut in the animation.
  useEffect(() => {
    FEATURES.forEach(f => {
      const img = new window.Image()
      img.src = f.img
    })
  }, [])

  // ── Phase 2: build timelines + ScrollTriggers, then refresh on asset load ─
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)

    const title       = titleRef.current
    const tClosed     = tClosedRef.current
    const tOpen       = tOpenRef.current
    const objWrap     = objWrapRef.current
    const feature     = featureRef.current
    const cta         = ctaRef.current
    const owlRise     = owlRiseRef.current
    const scrollSpace = scrollRef.current

    if (
      !title || !tClosed || !tOpen || !objWrap ||
      !feature || !cta || !owlRise || !scrollSpace
    ) return

    // Swap image, text and overlay for each feature.
    // Called via GSAP timeline callback — all content is static, no XSS risk.
    function setObject(f: Feature): void {
      const img   = objImgRef.current
      const ftEl  = fTitleRef.current
      const fdEl  = fDescRef.current
      const chat  = phoneChatRef.current
      const wrap  = objWrapRef.current
      if (!img || !ftEl || !fdEl || !chat || !wrap) return

      ftEl.innerHTML   = buildTitleHTML(f.title, f.highlight)
      fdEl.textContent = f.desc
      img.src          = f.img
      img.alt          = f.title
      // Phone gets 3× on mobile so the chat overlay stays readable;
      // all other objects get 1.4× to compensate for small vw sizes.
      const wMult = isMobile ? (f.isPhone ? 3.0 : 1.8) : 1
      wrap.style.width = `min(${f.baseW * wMult}vw,${f.baseW * 14}px)`
      chat.style.display = f.isPhone ? 'flex' : 'none'
    }

    const isMobile = window.innerWidth <= 640

    // ── Reduced-motion path: static, no scrub ────────────────────
    // Initial states were already applied by useIsomorphicLayoutEffect above.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setObject(FEATURES[0])
      return
    }

    // ── Animated path ─────────────────────────────────────────────
    // Initial states (xPercent/yPercent, opacity, y) were already applied
    // synchronously in useIsomorphicLayoutEffect — do not repeat gsap.set here.

    const ctx = gsap.context(() => {
      // Idle title sway — runs independently, never scrubbed
      gsap.fromTo(
        title,
        { rotationY: -12 },
        { rotationY: 12, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut' },
      )
      gsap.to(title, {
        y: '-=14', duration: 1.6, repeat: -1, yoyo: true, ease: 'sine.inOut',
      })

      // Master scrubbed timeline
      const master = gsap.timeline({
        scrollTrigger: {
          trigger: scrollSpace,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
        },
      })

      // Title fades out at the very start of the scroll.
      // On mobile, leave a ghost (5% opacity) so the top half of the tall
      // screen doesn't feel barren while objects animate in the lower half.
      master.to(title, { opacity: isMobile ? 0.05 : 0, scale: 0.8, duration: 0.5 }, 0)

      // Build one sub-timeline per feature
      for (const f of FEATURES) {
        const seg = gsap.timeline()

        // 0. Swap content at start of this segment
        seg.add(() => setObject(f))

        // On mobile, yPercent values are relative to the (small) object height, so
        // the default riseY numbers barely move objects on a tall phone screen.
        // Multiply by 2.5 (phone: 2.0) so objects travel well into the upper half.
        const riseY    = isMobile ? f.riseY * (f.isPhone ? 2.0 : 2.5) : f.riseY
        const flyZ     = isMobile ? 130 : 260
        const flyScale = isMobile ? f.flyScale * 0.88 : f.flyScale

        // 1. Drawer opens (cross-fade table-closed → table-open)
        seg.to(tClosed, { opacity: 0, duration: 0.4, ease: 'power1.inOut' })
        seg.to(tOpen,   { opacity: 1, duration: 0.4, ease: 'power1.inOut' }, '<')

        // 2. Object emerges from drawer cavity
        seg.fromTo(
          objWrap,
          { opacity: 0, scale: 0.4, yPercent: 25, xPercent: -50, z: 0 },
          { opacity: 1, scale: 0.7, yPercent: riseY * 0.55, duration: 1.0, ease: 'power2.out' },
        )

        // 3. Drawer closes while object keeps rising (overlap)
        seg.to(tOpen,   { opacity: 0, duration: 0.4, ease: 'power1.inOut' }, '-=0.6')
        seg.to(tClosed, { opacity: 1, duration: 0.4, ease: 'power1.inOut' }, '<')

        // 4. Rise to focus point; feature text fades in
        seg.to(objWrap, { yPercent: riseY, scale: 1, duration: 0.8, ease: 'power2.out' }, '-=0.2')
        seg.fromTo(feature, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.5 }, '-=0.45')

        // 5. Hold
        seg.to({}, { duration: 0.5 })

        // 6. Text out, then motion-B: grow toward viewer and fade.
        seg.to(feature, { opacity: 0, x: -20, duration: 0.4 })
        seg.to(objWrap, {
          z: flyZ,
          scale: flyScale,
          yPercent: riseY + 35,
          opacity: 0,
          duration: 1.0,
          ease: 'power2.in',
        })

        master.add(seg)
      }

      // 7. Ending CTA fades in over the empty table; owl rises up from drawer
      //    '<0.15' = owl starts 0.15 timeline-units after the CTA fade begins
      //    so the text leads slightly and the owl follows — feels like it's
      //    emerging from the drawer just as the scene settles.
      master.to(cta,     { opacity: 1, duration: 0.6 })
      master.to(owlRise, { y: 0, duration: 0.5, ease: 'back.out(1.4)' }, '<0.15')
    })

    // ── Post-setup refresh: re-measure after fonts and images settle ──────
    //
    // Three independent races all resolved here with a single `refresh` fn:
    //
    //   1. document.fonts.ready — custom fonts (Clash Display / Space Grotesk
    //      at clamp(64px,16vw,200px)) shift element heights when they swap in,
    //      invalidating every ScrollTrigger start/end pixel position.
    //
    //   2. Image load promise — on first visit (no cache) <img> elements have
    //      zero intrinsic height when gsap.context() runs, so yPercent
    //      transforms are evaluated against 0 px.  On reload images are
    //      returned from cache synchronously, masking the race.
    //
    //   3. requestAnimationFrame — catches the case where both fonts and images
    //      were already loaded/resolved before this effect ran (Promise .then
    //      callbacks are micro-tasks and may fire before layout is stable).
    //
    let active = true
    const refresh = () => { if (active) ScrollTrigger.refresh() }

    if (document.fonts?.ready) document.fonts.ready.then(refresh)
    requestAnimationFrame(refresh)

    const imgs = Array.from(
      stageRef.current?.querySelectorAll('img') ?? []
    ) as HTMLImageElement[]

    Promise.all(
      imgs.map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((res) => {
              img.addEventListener('load',  () => res(), { once: true })
              img.addEventListener('error', () => res(), { once: true })
            })
      )
    ).then(refresh)

    window.addEventListener('load', refresh)

    return () => {
      active = false
      window.removeEventListener('load', refresh)
      ctx.revert()
    }
  }, [])

  // ── JSX ───────────────────────────────────────────────────────────
  return (
    <>
      {/*
       * Fixed stage — covers the full viewport, light gradient.
       * zIndex:1 keeps it above the scroll spacer but below the header (zIndex:50).
       */}
      <div ref={stageRef} className="lc-stage">
        {/* ── CHOTU hero title ────────────────────────────────────── */}
        {/*
         * The <span> around "CHOTU" is intentional and must stay.
         *
         * React 19's concurrent hydrator wraps bare text children in a <span>
         * when the parent has white-space:nowrap, to stabilise text layout
         * across concurrent render passes.  The Next.js static pre-renderer
         * (build-time SSR) does NOT apply this normalisation, so without an
         * explicit <span> the server emits ">CHOTU<" while React on the client
         * expects "><span …>CHOTU</span><".  The mismatch causes React to scrap
         * the entire server tree and re-render from scratch — which is why GSAP
         * refs pointed at stale elements and animations didn't work until reload.
         *
         * Keeping the <span> in the JSX makes both render paths produce the same
         * DOM structure, eliminating the hydration error.
         *
         * whiteSpace:nowrap lives only on the <span> so the element the style
         * applies to is the same node on server and client.  The outer div keeps
         * only layout/animation styles — nothing that triggers text normalisation.
         */}
        <div ref={titleRef} aria-hidden="true" className="lc-title">
          <span style={{ whiteSpace: 'nowrap' }}>CHOTU</span>
        </div>

        {/* ── Wooden table (two cross-faded images) ───────────────── */}
        <div className="lc-table-wrap">
          {/* table-closed: visible at rest and after each drawer close */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={tClosedRef}
            src="/landing/table-closed.png"
            alt="wooden table"
            className="lc-table-img"
          />
          {/* table-open: fades in when drawer opens — starts hidden via inline opacity so GSAP can cross-fade */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={tOpenRef}
            src="/landing/table-open.png"
            alt=""
            aria-hidden="true"
            className="lc-table-img"
            style={{ opacity: 0 }}
          />
          {/*
           * Invisible spacer — same src as table-closed but visibility:hidden.
           * Gives the zero-height container intrinsic height so the
           * absolute-positioned table images push it open correctly.
           */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/table-closed.png"
            alt=""
            aria-hidden="true"
            style={{ width: '100%', height: 'auto', display: 'block', visibility: 'hidden' }}
          />
        </div>

        {/* ── Rising object wrap ───────────────────────────────────── */}
        {/*
         * z-index:4 = BEHIND the table front (z-index:5) so the object
         * appears to emerge from inside the drawer.
         * GSAP animates yPercent (vertical rise) and scale via transforms.
         */}
        <div ref={objWrapRef} className="lc-obj-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={objImgRef}
            src="/landing/checklist.png"
            alt=""
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              filter: 'drop-shadow(0 18px 30px rgba(0,0,0,.18))',
            }}
          />

          {/* Phone chat overlay — only shown when isPhone === true */}
          <div
            ref={phoneChatRef}
            style={{
              position: 'absolute',
              top: '5%',
              left: '8%',
              width: '84%',
              height: '85%',
              borderRadius: '9%/4.5%',
              overflow: 'hidden',
              background: '#0b141a',
              display: 'none',      // toggled by setObject
              flexDirection: 'column',
              fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
            }}
          >
            {/* WhatsApp-style header bar */}
            <div
              style={{
                background: '#1f2c34',
                color: '#fff',
                padding: '5% 6%',
                display: 'flex',
                alignItems: 'center',
                gap: '5%',
                fontSize: '.75em',
              }}
            >
              <div
                style={{
                  width: '1.6em',
                  height: '1.6em',
                  borderRadius: '50%',
                  background: '#3a4a54',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '.8em',
                  flexShrink: 0,
                }}
              >
                B
              </div>
              <span style={{ fontWeight: 600 }}>Batch Group</span>
            </div>

            {/* Chat body */}
            <div
              style={{
                flex: 1,
                padding: '6%',
                display: 'flex',
                flexDirection: 'column',
                gap: '5%',
                background: '#0b141a',
                overflowY: 'hidden',
              }}
            >
              {/* Incoming bubble */}
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: '#1f2c34',
                  maxWidth: '80%',
                  padding: '4% 5%',
                  borderRadius: '.8em',
                  fontSize: '.7em',
                  lineHeight: 1.3,
                  color: '#e9edef',
                }}
              >
                Bro can you share the DBMS notes PDF?
              </div>

              {/* Outgoing bubble */}
              <div
                style={{
                  alignSelf: 'flex-end',
                  background: '#005c4b',
                  maxWidth: '80%',
                  padding: '4% 5%',
                  borderRadius: '.8em',
                  fontSize: '.7em',
                  lineHeight: 1.3,
                  color: '#e9edef',
                }}
              >
                Yeah one sec
              </div>

              {/* PDF attachment bubble */}
              <div
                style={{
                  alignSelf: 'flex-end',
                  background: '#025144',
                  borderRadius: '.8em',
                  padding: '4%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5%',
                  maxWidth: '82%',
                }}
              >
                <div
                  style={{
                    background: '#e9edef',
                    color: '#c0392b',
                    fontSize: '.6em',
                    fontWeight: 700,
                    padding: '3% 5%',
                    borderRadius: '.3em',
                    flexShrink: 0,
                  }}
                >
                  PDF
                </div>
                <span style={{ color: '#e9edef', fontSize: '.62em' }}>DBMS_Unit3.pdf</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Feature text block ───────────────────────────────────── */}
        {/* Responsive positioning handled via .landing-feature CSS class */}
        <div ref={featureRef} className="landing-feature">
          <h2
            ref={fTitleRef}
            style={{
              fontFamily: "var(--font-fraunces),'Fraunces',serif",
              fontSize: 'clamp(26px,4vw,52px)',
              fontWeight: 600,
              lineHeight: 1.05,
              margin: '0 0 .5em',
              color: '#16181d',
            }}
          />
          <p
            ref={fDescRef}
            style={{
              fontFamily: "var(--font-space-grotesk),'Space Grotesk',sans-serif",
              fontSize: 'clamp(15px,1.5vw,19px)',
              lineHeight: 1.5,
              color: '#3a3d44',
              fontWeight: 400,
              margin: 0,
            }}
          />
        </div>

        {/* ── Ending CTA — fades in over the empty table ──────────── */}
        <div ref={ctaRef} className="lc-cta">
          {/*
           * Flex row: [CHOTU text] [LandingOwl]
           * Owl hovers here beside the CTA heading, giving the "flying in place"
           * look the user asked for. The whole ctaRef div fades in via GSAP
           * (opacity 0 → 1) so the owl appearance is handled for free.
           */}
          <div className="lc-cta-row">
            <h1 className="lc-cta-heading">CHOTU</h1>
            {/*
             * owlRiseRef wraps LandingOwl.
             * GSAP animates y on THIS div (the entrance rise).
             * The CSS float loop (lc-owl-hover) runs on the inner
             * .landing-owl-wrap inside LandingOwl — different elements,
             * so the two transform animations never collide.
             */}
            <div ref={owlRiseRef} style={{ flexShrink: 0 }}>
              <LandingOwl />
            </div>
          </div>
          <p className="lc-cta-tagline">
            Your study life, organised. One quiet place for everything.
          </p>
          <div className="lc-cta-actions">
            <Link href="/signup" className="lc-btn-primary">Get started</Link>
            <Link href="/login" className="lc-btn-outline">Sign in</Link>
          </div>
        </div>
      </div>

      {/* ── 900vh scroll spacer — drives the ScrollTrigger ─────────── */}
      {/*
       * pointerEvents:none ensures the spacer never intercepts clicks
       * regardless of what position GSAP's ScrollTrigger adds at runtime.
       * The fixed stage (zIndex:1) holds all interactive content.
       */}
      <div ref={scrollRef} style={{ height: '900vh', pointerEvents: 'none' }} />
    </>
  )
}
