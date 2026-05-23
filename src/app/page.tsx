import type { Metadata } from 'next'
import SiteHeader from '@/components/site-header'
import ScrollScene from '@/components/landing/ScrollScene'

export const metadata: Metadata = {
  title: 'CHOTU — Your student life, organized.',
  description:
    'Track assignments, exams, expenses, and more. Your personal academic companion.',
}

export default function LandingPage() {
  return (
    <main style={{ overscrollBehavior: 'none' }}>
      <SiteHeader />
      <ScrollScene />
    </main>
  )
}
