'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { examCreateSchema } from '@/lib/validations/exams'
import { createExam, updateExam, getExamReminders } from '@/lib/actions/exams'
import { ExamReminderConfig } from './exam-reminder-config'
import type { ExamReminderSelection } from '@/lib/exam-utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Database } from '@/types/database.types'

type Exam = Database['public']['Tables']['exams']['Row']
type FormValues = z.infer<typeof examCreateSchema>

interface Props {
  open:          boolean
  onOpenChange:  (open: boolean) => void
  exam?:         Exam | null
  examTypes?:    string[]   // for autocomplete datalist
}

function toDatetimeLocal(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16)
}

const DEFAULT_EXAM_AT = toDatetimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())

const DEFAULT_VALUES: Partial<FormValues> = {
  subject:       '',
  exam_type:     '',
  exam_at:       DEFAULT_EXAM_AT,
  venue:         '',
  syllabus_text: '',
  notes:         '',
  status:        'upcoming',
}

export function ExamForm({ open, onOpenChange, exam, examTypes = [] }: Props) {
  const isEdit = !!exam

  const [reminders, setReminders]   = useState<ExamReminderSelection[]>([])
  const [loadingReminders, setLR]   = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(examCreateSchema) as never,
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (!open) { setReminders([]); return }

    if (exam) {
      reset({
        subject:       exam.subject,
        exam_type:     '',
        exam_at:       toDatetimeLocal(exam.exam_at),
        venue:         exam.location ?? '',
        syllabus_text: '',
        notes:         exam.notes ?? '',
        status:        exam.status as FormValues['status'],
      })

      setLR(true)
      getExamReminders(exam.id).then((res) => {
        setLR(false)
        if (res.data) {
          setReminders(res.data.map((r) => ({
            reminder_type: r.reminder_type as ExamReminderSelection['reminder_type'],
          })))
        }
      })
    } else {
      reset(DEFAULT_VALUES)
      setReminders([])
    }
  }, [exam, open, reset])

  const statusVal = watch('status')
  const examAt    = watch('exam_at')

  const onSubmit = async (values: FormValues) => {
    const result = isEdit
      ? await updateExam({ ...values, id: exam!.id }, reminders)
      : await createExam(values, reminders)

    if (result.error) {
      setError('root', { message: result.error })
      return
    }
    onOpenChange(false)
  }

  const datalistId = 'exam-type-list'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Exam' : 'New Exam'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Subject */}
          <div className="space-y-1">
            <Label htmlFor="subject">Subject *</Label>
            <Input id="subject" placeholder="e.g. Mathematics" {...register('subject')} />
            {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
          </div>

          {/* Exam type with autocomplete */}
          <div className="space-y-1">
            <Label htmlFor="exam_type">Exam Type</Label>
            <Input
              id="exam_type"
              list={datalistId}
              placeholder="e.g. Mid-sem, Unit Test, Viva…"
              {...register('exam_type')}
            />
            <datalist id={datalistId}>
              {examTypes.map((t) => <option key={t} value={t} />)}
            </datalist>
            {errors.exam_type && (
              <p className="text-sm text-destructive">{errors.exam_type.message}</p>
            )}
          </div>

          {/* Date + venue */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="exam_at">Exam Date & Time *</Label>
              <Input id="exam_at" type="datetime-local" {...register('exam_at')} />
              {errors.exam_at && (
                <p className="text-sm text-destructive">{errors.exam_at.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="venue">Venue</Label>
              <Input id="venue" placeholder="e.g. Hall B, Room 201" {...register('venue')} />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={statusVal}
              onValueChange={(v) => { if (v) setValue('status', v as FormValues['status']) }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Syllabus */}
          <div className="space-y-1">
            <Label htmlFor="syllabus_text">Syllabus</Label>
            <Textarea
              id="syllabus_text"
              placeholder="Paste syllabus or list topics covered…"
              rows={3}
              {...register('syllabus_text')}
            />
            {errors.syllabus_text && (
              <p className="text-sm text-destructive">{errors.syllabus_text.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any extra notes…"
              rows={2}
              {...register('notes')}
            />
          </div>

          {/* Reminders */}
          <div className="border-t pt-3">
            {loadingReminders ? (
              <p className="text-xs text-muted-foreground">Loading reminders…</p>
            ) : (
              <ExamReminderConfig
                examAt={examAt ?? DEFAULT_EXAM_AT}
                value={reminders}
                onChange={setReminders}
              />
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Exam'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
