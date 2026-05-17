import type { Metadata } from 'next'
import Link from 'next/link'
import { OfflineReloadButton } from './reload-button'

export const metadata: Metadata = { title: 'You are offline' }

export default function OfflinePage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: '#0F0F0F' }}
    >
      <p
        className="text-6xl font-bold mb-6 select-none"
        style={{ color: '#2C3531' }}
        aria-hidden
      >
        —
      </p>

      <h1 className="text-2xl font-semibold mb-3" style={{ color: '#F5F5F0' }}>
        You are offline
      </h1>

      <p
        className="text-sm leading-relaxed mb-8 max-w-xs"
        style={{ color: '#555' }}
      >
        CHOTU needs a connection to load. Check your Wi-Fi or mobile data,
        then try again.
      </p>

      <OfflineReloadButton />

      <Link
        href="/"
        className="mt-4 text-xs transition-opacity hover:opacity-60"
        style={{ color: '#444' }}
      >
        Back to home
      </Link>
    </main>
  )
}
