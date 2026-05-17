'use client'

import { useState } from 'react'
import { AssignmentCard } from './assignment-card'
import { AssignmentForm } from './assignment-form'
import type { Database } from '@/types/database.types'

type Assignment  = Database['public']['Tables']['assignments']['Row']
type Attachment  = Database['public']['Tables']['assignment_attachments']['Row']
type Completion  = Database['public']['Tables']['recurring_completions']['Row']

interface Props {
  assignments:  Assignment[]
  attachments:  Attachment[]
  completions:  Completion[]
}

export function AssignmentList({ assignments, attachments, completions }: Props) {
  const [editTarget, setEditTarget] = useState<Assignment | null>(null)

  if (assignments.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-4xl mb-3">📚</p>
        <p className="font-medium">No assignments found</p>
        <p className="text-sm mt-1">Add one with the button above, or adjust your filters.</p>
      </div>
    )
  }

  const attachByAssignment = attachments.reduce<Record<string, Attachment[]>>((acc, att) => {
    ;(acc[att.assignment_id] ??= []).push(att)
    return acc
  }, {})

  const completionsByAssignment = completions.reduce<Record<string, Completion[]>>((acc, c) => {
    ;(acc[c.assignment_id] ??= []).push(c)
    return acc
  }, {})

  return (
    <>
      <div className="space-y-3">
        {assignments.map((a) => (
          <AssignmentCard
            key={a.id}
            assignment={a}
            attachments={attachByAssignment[a.id] ?? []}
            completions={completionsByAssignment[a.id] ?? []}
            onEdit={setEditTarget}
          />
        ))}
      </div>

      <AssignmentForm
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        assignment={editTarget}
      />
    </>
  )
}
