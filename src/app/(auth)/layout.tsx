export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: '#0F0F0F' }}
    >
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <div className="mb-8 text-center">
          <span
            className="text-4xl font-black tracking-widest"
            style={{ color: '#F5A623', letterSpacing: '0.18em' }}
          >
            CHOTU
          </span>
          <p className="mt-1 text-sm" style={{ color: '#9ca3af' }}>
            Your batch&apos;s command center
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border p-8"
          style={{
            background: '#161616',
            borderColor: '#2a2a2a',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
