import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Bunk Calculator — CHOTU' }

export default function SplitsPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="max-w-sm space-y-4">
        <div className="text-5xl">🎓</div>
        <h1 className="text-3xl font-bold">Bunk Calculator</h1>
        <p className="text-muted-foreground text-base leading-relaxed">
          Track how many classes you can bunk without dropping below 75% attendance — coming soon.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Coming Soon
        </div>
      </div>
    </main>
  )
}
