'use client'

import { useState, useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FriendPicker } from '@/components/splits/friends/friend-picker'
import { GroupPicker } from '@/components/splits/groups/group-picker'
import { createSplit, updateSplit } from '@/lib/actions/splits'
import { splitSchema, type SplitInput } from '@/lib/validations/splits'
import { equalSplit, formatRupees, sharesTotal, payerRemainder, toPaise } from '@/lib/split-utils'
import type { SplitWithShares } from '@/types/splits'

interface SplitFormProps {
  friends: Array<{ id: string; name: string }>
  groups: Array<{ id: string; name: string }>
  mode: 'add' | 'edit'
  defaultValues?: SplitWithShares
  onClose: () => void
}

function nowDatetimeLocal(): string {
  const now = new Date()
  // Format as datetime-local value (no seconds)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SplitForm({ friends, groups, mode, defaultValues, onClose }: SplitFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Selected friend ids for the picker
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>(
    defaultValues ? defaultValues.shares.map((s) => s.friend_id) : []
  )

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SplitInput>({
    resolver: zodResolver(splitSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      total_amount: defaultValues?.total_amount ?? ('' as unknown as number),
      paid_at: defaultValues?.paid_at
        ? new Date(defaultValues.paid_at).toISOString()
        : new Date().toISOString(),
      group_id: defaultValues?.group_id ?? undefined,
      shares: defaultValues?.shares.map((s) => ({
        friend_id: s.friend_id,
        amount_owed: s.amount_owed,
      })) ?? [],
    },
  })

  const { fields, replace } = useFieldArray({ control, name: 'shares' })

  const watchedShares = watch('shares')
  const watchedTotal = watch('total_amount')

  // Sync shares array when selectedFriendIds changes
  useEffect(() => {
    const currentShares = getValues('shares')
    const currentMap = new Map(
      currentShares.map((s) => [s.friend_id, s.amount_owed])
    )
    const newShares = selectedFriendIds.map((id) => ({
      friend_id: id,
      amount_owed: currentMap.get(id) ?? 0,
    }))
    replace(newShares)
  }, [selectedFriendIds, replace, getValues])

  const handleEqualSplit = () => {
    const total = Number(watchedTotal)
    if (!total || selectedFriendIds.length === 0) return
    const splits = equalSplit(total, selectedFriendIds)
    replace(splits)
  }

  const currentSharesTotal = watchedShares
    ? sharesTotal(watchedShares.map((s) => ({ amount_owed: Number(s.amount_owed) || 0 })))
    : 0
  const payerKeeps = watchedTotal
    ? payerRemainder(
        Number(watchedTotal) || 0,
        (watchedShares ?? []).map((s) => ({ amount_owed: Number(s.amount_owed) || 0 }))
      )
    : 0

  const onSubmit = async (data: SplitInput) => {
    setServerError(null)
    setSuccess(null)

    const result =
      mode === 'add'
        ? await createSplit(data)
        : await updateSplit(defaultValues?.id ?? '', data)

    if (result.error) {
      setServerError(result.error)
      return
    }

    setSuccess(mode === 'add' ? 'Split created!' : 'Split updated!')
    setTimeout(() => onClose(), 800)
  }

  const friendNameMap = new Map(friends.map((f) => [f.id, f.name]))

  // Shares validation error (from superRefine)
  const sharesError = errors.shares?.root?.message ?? (errors.shares as { message?: string } | undefined)?.message

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'New Split' : 'Edit Split'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Section 1: Details */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Details</p>

            <div className="space-y-1">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Dinner at Biryani House"
                autoComplete="off"
                {...register('title')}
              />
              {errors.title && (
                <p className="text-xs text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Any notes about this expense"
                rows={2}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="total_amount">Total Amount (₹) *</Label>
                <Input
                  id="total_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...register('total_amount', { valueAsNumber: true })}
                />
                {errors.total_amount && (
                  <p className="text-xs text-red-500">{errors.total_amount.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="paid_at">Date paid *</Label>
                <input
                  id="paid_at"
                  type="datetime-local"
                  defaultValue={
                    defaultValues?.paid_at
                      ? toDatetimeLocal(defaultValues.paid_at)
                      : nowDatetimeLocal()
                  }
                  onChange={(e) => {
                    const val = e.target.value
                    if (val) {
                      setValue('paid_at', new Date(val).toISOString())
                    }
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {errors.paid_at && (
                  <p className="text-xs text-red-500">{errors.paid_at.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Split with */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Split with</p>

            <div className="space-y-1">
              <Label>Group (optional)</Label>
              <Controller
                control={control}
                name="group_id"
                render={({ field }) => (
                  <GroupPicker
                    groups={groups}
                    value={field.value ?? null}
                    onChange={(id) => field.onChange(id ?? undefined)}
                  />
                )}
              />
            </div>

            <div className="space-y-1">
              <Label>Friends *</Label>
              <FriendPicker
                friends={friends}
                selected={selectedFriendIds}
                onChange={setSelectedFriendIds}
              />
              {errors.shares && (
                <p className="text-xs text-red-500">
                  {Array.isArray(errors.shares)
                    ? 'Fix share amounts below.'
                    : (errors.shares as { message?: string })?.message}
                </p>
              )}
            </div>

            {selectedFriendIds.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEqualSplit}
              >
                Equal split
              </Button>
            )}
          </div>

          {/* Section 3: Per-friend amounts */}
          {fields.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Amounts owed
              </p>

              <div className="space-y-2">
                {fields.map((field, index) => {
                  const friendName = friendNameMap.get(field.friend_id) ?? field.friend_id
                  return (
                    <div key={field.id} className="flex items-center gap-2">
                      <Label className="flex-1 text-sm truncate" htmlFor={`shares.${index}.amount_owed`}>
                        {friendName}
                      </Label>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground">₹</span>
                        <Input
                          id={`shares.${index}.amount_owed`}
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-28 h-8 text-sm"
                          {...register(`shares.${index}.amount_owed`, { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Running total bar */}
              <div className="rounded-md bg-muted px-3 py-2 text-xs flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  Assigned: <span className="font-semibold">{formatRupees(currentSharesTotal)}</span>
                </span>
                <span className={payerKeeps < 0 ? 'text-red-500' : 'text-green-600'}>
                  You keep: <span className="font-semibold">{formatRupees(Math.max(0, payerKeeps))}</span>
                </span>
                {Math.abs(toPaise(payerKeeps)) > 1 && watchedTotal > 0 && (
                  <span className="text-orange-500 font-medium">
                    {payerKeeps > 0
                      ? `${formatRupees(payerKeeps)} unassigned`
                      : `${formatRupees(-payerKeeps)} over-assigned`}
                  </span>
                )}
              </div>

              {sharesError && (
                <p className="text-xs text-red-500">{sharesError}</p>
              )}
            </div>
          )}

          {serverError && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded px-3 py-2">
              {serverError}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
              {success}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Saving…'
                : mode === 'add'
                ? 'Create Split'
                : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
