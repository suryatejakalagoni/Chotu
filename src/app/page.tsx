import type { Metadata } from 'next'
import { headers } from 'next/headers'
import LandingDesktop from '@/components/landing/landing-desktop'
import LandingMobile from '@/components/landing/landing-mobile'

export const metadata: Metadata = {
  title: "CHOTU — Your batch's command center",
  description:
    'Assignments, exams, expenses, splits, and community hub for college students.',
}

const MOBILE_RE =
  /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|webOS/i

export default async function LandingPage() {
  const ua = (await headers()).get('user-agent') ?? ''
  const isMobile = MOBILE_RE.test(ua)
  return isMobile ? <LandingMobile /> : <LandingDesktop />
}
