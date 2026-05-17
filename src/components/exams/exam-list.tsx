'use client'

import { useState } from 'react'
import { ExamCard } from './exam-card'
import { ExamForm } from './exam-form'
import type { Database } from '@/types/database.types'

type Exam  = Database['public']['Tables']['exams']['Row']
type Topic = Database['public']['Tables']['exam_topics']['Row']

interface Props {
  exams:      Exam[]
  topics:     Topic[]
  examTypes:  string[]
}

export function ExamList({ exams, topics, examTypes }: Props) {
  const [editExam, setEditExam] = useState<Exam | null>(null)

  if (exams.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground text-sm">
        No exams yet. Add your first exam to start tracking.
      </div>
    )
  }

  // Build topic summary map keyed by exam_id
  const topicMap = topics.reduce<Record<string, { total: number; revised: number }>>(
    (acc, t) => {
      if (!acc[t.exam_id]) acc[t.exam_id] = { total: 0, revised: 0 }
      acc[t.exam_id].total++
      if (t.is_revised) acc[t.exam_id].revised++
      return acc
    },
    {},
  )

  return (
    <>
      <div className="space-y-3">
        {exams.map((exam) => (
          <ExamCard
            key={exam.id}
            exam={exam}
            topicSummary={topicMap[exam.id] ?? { total: 0, revised: 0 }}
            onEdit={setEditExam}
          />
        ))}
      </div>

      <ExamForm
        open={!!editExam}
        onOpenChange={(open) => { if (!open) setEditExam(null) }}
        exam={editExam}
        examTypes={examTypes}
      />
    </>
  )
}
