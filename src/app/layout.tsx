import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ServiceWorkerRegistration } from '@/components/layout/service-worker-registration'
import { ThemeProvider } from '@/components/layout/theme-provider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const viewport: Viewport = {
  themeColor: '#2C3531',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
}

export const metadata: Metadata = {
  title: {
    template: '%s — CHOTU',
    default: "CHOTU — Your batch's command center",
  },
  description:
    'Assignments, exams, expenses, splits, and community hub for college students.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CHOTU',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
    icon: '/icons/icon-192.png',
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider />
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
