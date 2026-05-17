'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AssignmentForm } from './assignment-form'

export function AddAssignmentButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>+ Add Assignment</Button>
      <AssignmentForm open={open} onOpenChange={setOpen} />
    </>
  )
}
