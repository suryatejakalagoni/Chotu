'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CONTENT_TYPES, type ContentType } from '@/lib/validations/community'
import { contentTypeLabel } from '@/lib/community-utils'

export function PostFilters() {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  const push = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (value && value !== 'all') {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      next.delete('page') // reset pagination on filter change
      router.push(`${pathname}?${next.toString()}`)
    },
    [params, pathname, router]
  )

  const sortValue    = params.get('sort')         || 'newest'
  const ctValue      = params.get('content_type') || 'all'

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Search */}
      <Input
        placeholder="Search by title…"
        defaultValue={params.get('search') ?? undefined}
        onChange={(e) => push('search', e.target.value)}
        className="h-8 w-48 text-sm"
      />

      {/* Sort */}
      <Select
        value={sortValue}
        onValueChange={(v) => push('sort', v ?? 'newest')}
      >
        <SelectTrigger className="h-8 w-36 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="top">Most upvoted</SelectItem>
          <SelectItem value="downloads">Most downloaded</SelectItem>
          <SelectItem value="popular">Popular this week</SelectItem>
        </SelectContent>
      </Select>

      {/* Content type filter */}
      <Select
        value={ctValue}
        onValueChange={(v) => push('content_type', v ?? 'all')}
      >
        <SelectTrigger className="h-8 w-40 text-sm">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {CONTENT_TYPES.map((ct: ContentType) => (
            <SelectItem key={ct} value={ct}>{contentTypeLabel(ct)}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Subject filter */}
      <Input
        placeholder="Filter by subject…"
        defaultValue={params.get('subject_tag') ?? undefined}
        onChange={(e) => push('subject_tag', e.target.value)}
        className="h-8 w-40 text-sm"
      />
    </div>
  )
}
