'use client'

export function OfflineReloadButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="inline-flex items-center px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
      style={{ backgroundColor: '#F5A623', color: '#0F0F0F' }}
    >
      Try again
    </button>
  )
}
