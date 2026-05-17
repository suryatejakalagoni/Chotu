export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">CHOTU</h1>
          <p className="mt-1 text-sm text-gray-500">Your classmate companion</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
