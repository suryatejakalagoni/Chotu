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

interface Props {
  examTypes: string[]
}

export function ExamFilters({ examTypes }: Props) {
  const router     = useRouter()
  const pathname   = usePathname()
  const params     = useSearchParams()

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString())
      if (value && value !== 'all') {
        next.set(key, value)
      } else {
        next.delete(key)
      }
      next.delete('page')
      router.push(`${pathname}?${next.toString()}`)
    },
    [params, pathname, router],
  )

  return (
    <div className="flex flex-wrap gap-3 items-end">
      {/* Subject search */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Subject</p>
        <Input
          placeholder="Filter by subject…"
          className="h-8 w-44 text-sm"
          defaultValue={params.get('subject') ?? ''}
          onChange={(e) => update('subject', e.target.value)}
        />
      </div>

      {/* Exam type */}
      {examTypes.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Type</p>
          <Select
            value={(params.get('exam_type') ?? '') as string}
            onValueChange={(v) => v && update('exam_type', v)}
          >
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {examTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Date from */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">From</p>
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          defaultValue={params.get('from') ?? ''}
          onChange={(e) => update('from', e.target.value)}
        />
      </div>

      {/* Date to */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">To</p>
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          defaultValue={params.get('to') ?? ''}
          onChange={(e) => update('to', e.target.value)}
        />
      </div>

      {/* Sort */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Sort</p>
        <Select
          value={(params.get('sort') ?? 'exam_asc') as string}
          onValueChange={(v) => v && update('sort', v)}
        >
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="exam_asc">Date (earliest)</SelectItem>
            <SelectItem value="exam_desc">Date (latest)</SelectItem>
            <SelectItem value="subject_asc">Subject A→Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
