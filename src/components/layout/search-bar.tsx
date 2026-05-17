'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'

export function SearchBar() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = inputRef.current?.value.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={onSubmit} className="relative w-full">
      <Search
        size={14}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <input
        ref={inputRef}
        type="search"
        placeholder="Search assignments, expenses…"
        className="w-full h-8 pl-8 pr-3 text-sm rounded-md border bg-muted/40 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </form>
  )
}
