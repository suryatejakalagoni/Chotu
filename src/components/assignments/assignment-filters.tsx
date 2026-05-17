'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AssignmentFilters() {
  const router = useRouter()
  const params = useSearchParams()

  const set = useCallback(
    (key: string, value: string) => {
      const p = new URLSearchParams(params.toString())
      if (value && value !== 'all') {
        p.set(key, value)
      } else {
        p.delete(key)
      }
      router.push(`/assignments?${p.toString()}`)
    },
    [params, router]
  )

  const statusVal  = params.get('status')  ?? 'all'
  const sortVal    = params.get('sort')    ?? 'due_asc'
  const subjectVal = params.get('subject') ?? ''
  const fromVal    = params.get('from')    ?? ''
  const toVal      = params.get('to')      ?? ''

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Input
        placeholder="Subject..."
        className="w-36 h-9 text-sm"
        defaultValue={subjectVal}
        onChange={(e) => set('subject', e.target.value)}
      />

      <Select value={statusVal} onValueChange={(v) => set('status', v ?? 'all')}>
        <SelectTrigger className="w-38 h-9 text-sm">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="not_started">Not Started</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="done">Done</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1">
        <Input
          type="date"
          className="w-36 h-9 text-sm"
          defaultValue={fromVal}
          onChange={(e) => set('from', e.target.value)}
        />
        <span className="text-muted-foreground text-sm">–</span>
        <Input
          type="date"
          className="w-36 h-9 text-sm"
          defaultValue={toVal}
          onChange={(e) => set('to', e.target.value)}
        />
      </div>

      <Select value={sortVal} onValueChange={(v) => set('sort', v ?? 'due_asc')}>
        <SelectTrigger className="w-40 h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="due_asc">Due Date ↑</SelectItem>
          <SelectItem value="due_desc">Due Date ↓</SelectItem>
          <SelectItem value="subject_asc">Subject A–Z</SelectItem>
          <SelectItem value="status_asc">Status</SelectItem>
        </SelectContent>
      </Select>

      {(statusVal !== 'all' || subjectVal || fromVal || toVal) && (
        <Button variant="ghost" size="sm" onClick={() => router.push('/assignments')}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
