'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { assignmentCreateSchema } from '@/lib/validations/assignments'
import { createAssignment, updateAssignment, getAssignmentReminders } from '@/lib/actions/assignments'
import { buildWeeklyRRule, describeRRule, type ReminderSelection } from '@/lib/assignment-utils'
import { ReminderConfig } from './reminder-config'
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

type Assignment = Database['public']['Tables']['assignments']['Row']
type FormValues = z.infer<typeof assignmentCreateSchema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment?: Assignment | null
}

function toDatetimeLocal(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16)
}

const DEFAULT_DUE = toDatetimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())

const DEFAULT_VALUES: Partial<FormValues> = {
  subject:           '',
  title:             '',
  description:       '',
  due_at:            DEFAULT_DUE,
  estimated_minutes: undefined,
  status:            'not_started',
  priority:          'medium',
  notes:             '',
  is_recurring:      false,
  recurrence_rule:   '',
}

export function AssignmentForm({ open, onOpenChange, assignment }: Props) {
  const isEdit = !!assignment

  const [reminders, setReminders]       = useState<ReminderSelection[]>([])
  const [loadingReminders, setLR]       = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(assignmentCreateSchema) as never,
    defaultValues: DEFAULT_VALUES,
  })

  // Load existing reminders when editing
  useEffect(() => {
    if (!open) { setReminders([]); return }

    if (assignment) {
      reset({
        subject:           assignment.subject,
        title:             assignment.title,
        description:       assignment.description ?? '',
        due_at:            toDatetimeLocal(assignment.due_at),
        estimated_minutes: assignment.estimated_minutes ?? undefined,
        status:            assignment.status as FormValues['status'],
        priority:          assignment.priority as FormValues['priority'],
        notes:             assignment.notes ?? '',
        is_recurring:      assignment.is_recurring,
        recurrence_rule:   assignment.recurrence_rule ?? '',
      })

      setLR(true)
      getAssignmentReminders(assignment.id).then((res) => {
        setLR(false)
        if (res.data) {
          // Map DB rows back to ReminderSelection
          setReminders(res.data.map((r) => ({
            reminder_type: r.reminder_type as ReminderSelection['reminder_type'],
            custom_time:   r.reminder_type === 'custom' ? r.trigger_at : undefined,
          })))
        }
      })
    } else {
      reset(DEFAULT_VALUES)
      setReminders([])
    }
  }, [assignment, open, reset])

  const isRecurring = watch('is_recurring')
  const dueAt       = watch('due_at')
  const statusVal   = watch('status')
  const priorityVal = watch('priority')

  // Auto-build RRULE whenever due_at or is_recurring changes
  useEffect(() => {
    if (isRecurring && dueAt) {
      const rule = buildWeeklyRRule(new Date(dueAt))
      setValue('recurrence_rule', rule)
    } else {
      setValue('recurrence_rule', '')
    }
  }, [isRecurring, dueAt, setValue])

  const rrulePreview = isRecurring && dueAt
    ? describeRRule(buildWeeklyRRule(new Date(dueAt)))
    : null

  const onSubmit = async (values: FormValues) => {
    const result = isEdit
      ? await updateAssignment({ ...values, id: assignment!.id }, reminders)
      : await createAssignment(values, reminders)

    if (result.error) {
      setError('root', { message: result.error })
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Assignment' : 'New Assignment'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Subject */}
          <div className="space-y-1">
            <Label htmlFor="subject">Subject *</Label>
            <Input id="subject" placeholder="e.g. Mathematics" {...register('subject')} />
            {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="title">Assignment Title *</Label>
            <Input id="title" placeholder="e.g. Chapter 5 Exercises" {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What needs to be done..."
              rows={2}
              {...register('description')}
            />
          </div>

          {/* Due date + estimated time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="due_at">Due Date *</Label>
              <Input id="due_at" type="datetime-local" {...register('due_at')} />
              {errors.due_at && (
                <p className="text-sm text-destructive">{errors.due_at.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="estimated_minutes">Est. Time (min)</Label>
              <Input
                id="estimated_minutes"
                type="number"
                min={1}
                max={10000}
                placeholder="e.g. 90"
                {...register('estimated_minutes', { valueAsNumber: true })}
              />
            </div>
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={statusVal} onValueChange={(v) => v && setValue('status', v as FormValues['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={priorityVal} onValueChange={(v) => v && setValue('priority', v as FormValues['priority'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recurring toggle */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 accent-primary"
                {...register('is_recurring')}
              />
              <span className="text-sm font-medium">Repeat weekly</span>
            </label>
            {rrulePreview && (
              <p className="text-xs text-muted-foreground ml-6">
                ↻ {rrulePreview} (based on due date's day)
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any extra notes..."
              rows={2}
              {...register('notes')}
            />
          </div>

          {/* Reminder config */}
          <div className="border-t pt-3">
            {loadingReminders ? (
              <p className="text-xs text-muted-foreground">Loading reminders…</p>
            ) : (
              <ReminderConfig
                dueAt={dueAt ?? DEFAULT_DUE}
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
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Assignment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
