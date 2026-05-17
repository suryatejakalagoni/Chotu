'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { addFriend, updateFriend } from '@/lib/actions/friends'
import { friendSchema, type FriendInput } from '@/lib/validations/splits'

interface FriendFormProps {
  mode: 'add' | 'edit'
  defaultValues?: { name: string; email?: string }
  friendId?: string
  onClose: () => void
}

export function FriendForm({ mode, defaultValues, friendId, onClose }: FriendFormProps) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FriendInput>({
    resolver: zodResolver(friendSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      email: defaultValues?.email ?? '',
    },
  })

  const onSubmit = async (data: FriendInput) => {
    setServerError(null)
    setSuccess(null)

    const result =
      mode === 'add'
        ? await addFriend(data)
        : await updateFriend(friendId ?? '', data)

    if (result.error) {
      setServerError(result.error)
      return
    }

    setSuccess(mode === 'add' ? 'Friend added!' : 'Friend updated!')
    setTimeout(() => onClose(), 800)
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Friend' : 'Edit Friend'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="e.g. Ravi"
              autoComplete="off"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="ravi@example.com"
              autoComplete="off"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

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
              {isSubmitting ? 'Saving…' : mode === 'add' ? 'Add Friend' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
