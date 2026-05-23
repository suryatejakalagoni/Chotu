'use client'

import Owl from '@/components/Owl'

/**
 * CTA-section owl — sits beside the "CHOTU" heading in the ending CTA card.
 *
 * Appearance: inherited from the parent ctaRef GSAP opacity fade-in
 *             (opacity 0 → 1 at scroll end in ScrollScene). No extra GSAP here.
 * Float:      `.landing-owl-wrap` CSS keyframe gives the gentle vertical bob
 *             that makes it look like it's flying in place.
 * Speech bubble: always rendered; appears naturally with the parent fade-in.
 * Reduced motion: CSS handles it — `.landing-owl-wrap` animation disabled.
 * Mouse tracking: delegated to <Owl state="idle"> via useOwlPupils.
 */
export default function LandingOwl() {
  return (
    /*
     * position:relative — anchors the speech bubble's absolute coords.
     * flexShrink:0      — prevents the flex row from squishing the owl.
     * pointerEvents:none — CTA div disables them; explicit here so the owl
     *                      never blocks the Get started / Sign in buttons.
     */
    <div
      className="landing-owl-wrap"
      style={{
        position:      'relative',
        flexShrink:    0,
        alignSelf:     'center',
        width:         'clamp(52px, 5.3vw, 68px)',
        pointerEvents: 'none',
        userSelect:    'none',
      }}
    >
      <Owl state="idle" className="block w-full" />

      <div
        className="landing-owl-bubble"
        aria-hidden="true"
      >
        Hi buddy I am CHOTU
      </div>
    </div>
  )
}
