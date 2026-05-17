'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { splitSchema } from '@/lib/validations/splits'
import type { SplitWithShares } from '@/types/splits'

export type ActionResult = { error?: string }

async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function createSplit(
  raw: unknown
): Promise<ActionResult & { id?: string }> {
  const parsed = splitSchema.safeParse(raw)
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()
    const { title, description, total_amount, paid_at, group_id, shares } =
      parsed.data

    // Verify all friend_ids belong to current user
    const friendIds = shares.map((s) => s.friend_id)
    const { data: validFriends } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', user.id)
      .in('id', friendIds)
      .is('deleted_at', null)

    if (!validFriends || validFriends.length !== friendIds.length) {
      return { error: 'One or more friends not found.' }
    }

    // Verify group belongs to current user (if provided)
    if (group_id) {
      const { data: group } = await supabase
        .from('split_groups')
        .select('id')
        .eq('id', group_id)
        .eq('owner_id', user.id)
        .maybeSingle()
      if (!group) return { error: 'Group not found.' }
    }

    const { data: split, error: sErr } = await supabase
      .from('splits')
      .insert({
        created_by: user.id,
        paid_by: user.id,
        title,
        description: description || null,
        total_amount,
        paid_at: new Date(paid_at).toISOString(),
        group_id: group_id || null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (sErr || !split) {
      console.error('[createSplit]', sErr?.message)
      return { error: 'Could not create split. Please try again.' }
    }

    // Insert shares
    const { error: shErr } = await supabase.from('split_shares').insert(
      shares.map((s) => ({
        split_id: split.id,
        friend_id: s.friend_id,
        amount_owed: s.amount_owed,
        is_settled: false,
      }))
    )

    if (shErr) {
      // Rollback split
      await supabase.from('splits').delete().eq('id', split.id)
      console.error('[createSplit shares]', shErr.message)
      return { error: 'Could not save shares. Please try again.' }
    }

    revalidatePath('/splits')
    revalidatePath('/dashboard')
    return { id: split.id }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function updateSplit(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  if (!id) return { error: 'Invalid split.' }
  const parsed = splitSchema.safeParse(raw)
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()
    const { title, description, total_amount, paid_at, group_id, shares } =
      parsed.data

    // Verify ownership
    const { data: existing } = await supabase
      .from('splits')
      .select('id')
      .eq('id', id)
      .eq('created_by', user.id)
      .maybeSingle()

    if (!existing) return { error: 'Split not found.' }

    // Verify all friend_ids
    const friendIds = shares.map((s) => s.friend_id)
    const { data: validFriends } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', user.id)
      .in('id', friendIds)

    if (!validFriends || validFriends.length !== friendIds.length) {
      return { error: 'One or more friends not found.' }
    }

    const { error: sErr } = await supabase
      .from('splits')
      .update({
        title,
        description: description || null,
        total_amount,
        paid_at: new Date(paid_at).toISOString(),
        group_id: group_id || null,
      })
      .eq('id', id)
      .eq('created_by', user.id)

    if (sErr) {
      console.error('[updateSplit]', sErr.message)
      return { error: 'Could not update split. Please try again.' }
    }

    // Replace shares: delete old, insert new
    await supabase.from('split_shares').delete().eq('split_id', id)

    const { error: shErr } = await supabase.from('split_shares').insert(
      shares.map((s) => ({
        split_id: id,
        friend_id: s.friend_id,
        amount_owed: s.amount_owed,
        is_settled: false,
      }))
    )

    if (shErr) {
      console.error('[updateSplit shares]', shErr.message)
      return { error: 'Could not update shares. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/splits')
  revalidatePath('/dashboard')
  return {}
}

export async function deleteSplit(id: string): Promise<ActionResult> {
  if (!id) return { error: 'Invalid split.' }

  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase
      .from('splits')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id)

    if (error) {
      console.error('[deleteSplit]', error.message)
      return { error: 'Could not delete split. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/splits')
  revalidatePath('/dashboard')
  return {}
}

export async function settleShare(shareId: string): Promise<ActionResult> {
  if (!shareId) return { error: 'Invalid share.' }

  try {
    const { supabase, user } = await getAuthUser()

    // Verify via parent split ownership
    const { data: share } = await supabase
      .from('split_shares')
      .select('id, split_id, is_settled')
      .eq('id', shareId)
      .maybeSingle()

    if (!share) return { error: 'Share not found.' }

    const { data: split } = await supabase
      .from('splits')
      .select('id')
      .eq('id', share.split_id)
      .eq('created_by', user.id)
      .maybeSingle()

    if (!split) return { error: 'Not authorized.' }

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('split_shares')
      .update({ is_settled: true, settled_at: now })
      .eq('id', shareId)

    if (error) {
      console.error('[settleShare]', error.message)
      return { error: 'Could not settle share. Please try again.' }
    }

    // Auto-update split status if all shares settled
    const { data: remaining } = await supabase
      .from('split_shares')
      .select('id')
      .eq('split_id', share.split_id)
      .eq('is_settled', false)

    if ((remaining ?? []).length === 0) {
      await supabase
        .from('splits')
        .update({ status: 'settled' })
        .eq('id', share.split_id)
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/splits')
  revalidatePath('/dashboard')
  return {}
}

export async function unsettleShare(shareId: string): Promise<ActionResult> {
  if (!shareId) return { error: 'Invalid share.' }

  try {
    const { supabase, user } = await getAuthUser()

    const { data: share } = await supabase
      .from('split_shares')
      .select('id, split_id')
      .eq('id', shareId)
      .maybeSingle()

    if (!share) return { error: 'Share not found.' }

    const { data: split } = await supabase
      .from('splits')
      .select('id')
      .eq('id', share.split_id)
      .eq('created_by', user.id)
      .maybeSingle()

    if (!split) return { error: 'Not authorized.' }

    const { error } = await supabase
      .from('split_shares')
      .update({ is_settled: false, settled_at: null })
      .eq('id', shareId)

    if (error) {
      console.error('[unsettleShare]', error.message)
      return { error: 'Could not unsettle share. Please try again.' }
    }

    // Reopen split if it was fully settled
    await supabase
      .from('splits')
      .update({ status: 'pending' })
      .eq('id', share.split_id)
      .eq('status', 'settled')
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/splits')
  revalidatePath('/dashboard')
  return {}
}

export async function getSplitsWithShares(filter?: {
  status?: 'pending' | 'settled'
  friend_id?: string
  group_id?: string
}): Promise<{ splits: SplitWithShares[]; error?: string }> {
  try {
    const { supabase, user } = await getAuthUser()

    let query = supabase
      .from('splits')
      .select(
        `
        id, title, description, total_amount, paid_at, group_id, status, created_at,
        split_groups(name),
        split_shares(id, friend_id, amount_owed, is_settled, settled_at, friends(name))
      `
      )
      .eq('created_by', user.id)
      .order('paid_at', { ascending: false })

    if (filter?.status) query = query.eq('status', filter.status)
    if (filter?.group_id) query = query.eq('group_id', filter.group_id)

    const { data, error } = await query

    if (error) {
      console.error('[getSplitsWithShares]', error.message)
      return { splits: [], error: 'Could not load splits.' }
    }

    type RawShare = {
      id: string
      friend_id: string
      amount_owed: number
      is_settled: boolean
      settled_at: string | null
      friends: { name: string } | null
    }

    let result = (data ?? []).map((s) => {
      const shares = ((s.split_shares as unknown as RawShare[]) ?? []).map((sh) => ({
        id: sh.id,
        friend_id: sh.friend_id,
        friend_name: sh.friends?.name ?? 'Unknown',
        amount_owed: sh.amount_owed,
        is_settled: sh.is_settled,
        settled_at: sh.settled_at,
      }))

      return {
        id: s.id,
        title: s.title,
        description: s.description ?? null,
        total_amount: s.total_amount,
        paid_at: s.paid_at,
        group_id: s.group_id ?? null,
        group_name:
          (s.split_groups as unknown as { name: string } | null)?.name ?? null,
        status: s.status as 'pending' | 'settled',
        created_at: s.created_at,
        shares,
      }
    })

    // Filter by friend_id after fetch
    if (filter?.friend_id) {
      result = result.filter((s) =>
        s.shares.some((sh) => sh.friend_id === filter.friend_id)
      )
    }

    return { splits: result }
  } catch {
    return { splits: [], error: 'Not authenticated.' }
  }
}

export async function getSplitById(id: string): Promise<{
  split: SplitWithShares | null
  error?: string
}> {
  if (!id) return { split: null, error: 'Invalid split.' }

  try {
    const { supabase, user } = await getAuthUser()

    const { data, error } = await supabase
      .from('splits')
      .select(
        `
        id, title, description, total_amount, paid_at, group_id, status, created_at,
        split_groups(name),
        split_shares(id, friend_id, amount_owed, is_settled, settled_at, friends(name))
      `
      )
      .eq('id', id)
      .eq('created_by', user.id)
      .single()

    if (error || !data) {
      return { split: null, error: 'Split not found.' }
    }

    type RawShare = {
      id: string
      friend_id: string
      amount_owed: number
      is_settled: boolean
      settled_at: string | null
      friends: { name: string } | null
    }

    const shares = ((data.split_shares as unknown as RawShare[]) ?? []).map((sh) => ({
      id: sh.id,
      friend_id: sh.friend_id,
      friend_name: sh.friends?.name ?? 'Unknown',
      amount_owed: sh.amount_owed,
      is_settled: sh.is_settled,
      settled_at: sh.settled_at,
    }))

    return {
      split: {
        id: data.id,
        title: data.title,
        description: data.description ?? null,
        total_amount: data.total_amount,
        paid_at: data.paid_at,
        group_id: data.group_id ?? null,
        group_name:
          (data.split_groups as unknown as { name: string } | null)?.name ?? null,
        status: data.status as 'pending' | 'settled',
        created_at: data.created_at,
        shares,
      },
    }
  } catch {
    return { split: null, error: 'Not authenticated.' }
  }
}

export async function getTotalOwed(): Promise<number> {
  try {
    const { supabase, user } = await getAuthUser()

    const { data: splits } = await supabase
      .from('splits')
      .select('id')
      .eq('created_by', user.id)
      .eq('status', 'pending')

    if (!splits || splits.length === 0) return 0

    const { data: shares } = await supabase
      .from('split_shares')
      .select('amount_owed')
      .in(
        'split_id',
        splits.map((s) => s.id)
      )
      .eq('is_settled', false)

    return (shares ?? []).reduce((sum, s) => sum + s.amount_owed, 0)
  } catch {
    return 0
  }
}
