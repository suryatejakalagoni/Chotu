'use client'

import { useState } from 'react'
import { ExamForm } from './exam-form'
import { Button } from '@/components/ui/button'

interface Props {
  examTypes?: string[]
}

export function AddExamButton({ examTypes = [] }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add Exam</Button>
      <ExamForm open={open} onOpenChange={setOpen} examTypes={examTypes} />
    </>
  )
}
