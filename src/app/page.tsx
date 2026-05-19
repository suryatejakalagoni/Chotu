import type { Metadata } from 'next'
import Header from '@/components/landing/Header'
import ScrollScene from '@/components/landing/ScrollScene'
import CTASection from '@/components/landing/CTASection'

export const metadata: Metadata = {
  title: 'CHOTU — Your student life, organized.',
  description:
    'Track assignments, exams, expenses, and more. Your personal academic companion.',
}

export default function LandingPage() {
  return (
    <main className="overscroll-none">
      <Header />
      <ScrollScene />
      <CTASection />
    </main>
  )
}
