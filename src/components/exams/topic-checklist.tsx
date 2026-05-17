'use client'

import { useState, useTransition } from 'react'
import { createTopic, toggleTopic, deleteTopic } from '@/lib/actions/exams'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Database } from '@/types/database.types'

type Topic = Database['public']['Tables']['exam_topics']['Row']

interface Props {
  examId: string
  topics: Topic[]
}

export function TopicChecklist({ examId, topics }: Props) {
  const [newText, setNewText]   = useState('')
  const [addErr, setAddErr]     = useState<string | null>(null)
  const [isPending, startTrans] = useTransition()

  const revised = topics.filter((t) => t.is_revised).length
  const total   = topics.length
  const pct     = total === 0 ? 0 : Math.round((revised / total) * 100)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newText.trim()) return
    setAddErr(null)
    const result = await createTopic({ exam_id: examId, topic_text: newText.trim() })
    if (result.error) { setAddErr(result.error); return }
    setNewText('')
  }

  function handleToggle(topicId: string, currentVal: boolean) {
    startTrans(async () => {
      await toggleTopic({ id: topicId, is_revised: !currentVal })
    })
  }

  function handleDelete(topicId: string) {
    startTrans(async () => {
      await deleteTopic(topicId)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Topics ({revised}/{total} revised)</p>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">{pct}%</span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Topic list */}
      <ul className="space-y-1.5">
        {topics.map((topic) => (
          <li
            key={topic.id}
            className="flex items-center gap-2 group"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 accent-primary shrink-0"
              checked={topic.is_revised}
              disabled={isPending}
              onChange={() => handleToggle(topic.id, topic.is_revised)}
            />
            <span
              className={`flex-1 text-sm ${topic.is_revised ? 'line-through text-muted-foreground' : ''}`}
            >
              {topic.topic_text}
            </span>
            <button
              type="button"
              className="opacity-0 group-hover:opacity-100 text-xs text-destructive hover:underline transition-opacity"
              disabled={isPending}
              onClick={() => handleDelete(topic.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {/* Add topic */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          placeholder="Add a topic…"
          className="h-8 text-sm flex-1"
          value={newText}
          maxLength={300}
          onChange={(e) => setNewText(e.target.value)}
        />
        <Button type="submit" size="sm" className="h-8" disabled={isPending || !newText.trim()}>
          Add
        </Button>
      </form>
      {addErr && <p className="text-xs text-destructive">{addErr}</p>}
    </div>
  )
}
