'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { friendSchema } from '@/lib/validations/splits'

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

export async function addFriend(raw: unknown): Promise<ActionResult> {
  const parsed = friendSchema.safeParse(raw)
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()
    const { name, email } = parsed.data

    // Check duplicate name (case-insensitive, among active friends)
    const { data: existing } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', name)
      .is('deleted_at', null)
      .maybeSingle()

    if (existing) return { error: 'You already have a friend with this name.' }

    const { error } = await supabase.from('friends').insert({
      user_id: user.id,
      name,
      email: email || null,
    })

    if (error) {
      console.error('[addFriend]', error.message)
      return { error: 'Could not add friend. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/splits')
  return {}
}

export async function updateFriend(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  if (!id) return { error: 'Invalid friend.' }
  const parsed = friendSchema.safeParse(raw)
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()
    const { name, email } = parsed.data

    // Check duplicate name (exclude self)
    const { data: existing } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', name)
      .is('deleted_at', null)
      .neq('id', id)
      .maybeSingle()

    if (existing) return { error: 'You already have a friend with this name.' }

    const { error } = await supabase
      .from('friends')
      .update({ name, email: email || null })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[updateFriend]', error.message)
      return { error: 'Could not update friend. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/splits')
  return {}
}

export async function deleteFriend(
  id: string
): Promise<ActionResult & { hasOpenSplits?: boolean }> {
  if (!id) return { error: 'Invalid friend.' }

  try {
    const { supabase, user } = await getAuthUser()

    // Verify ownership
    const { data: friend } = await supabase
      .from('friends')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!friend) return { error: 'Friend not found.' }

    // Check for open splits
    const { count } = await supabase
      .from('split_shares')
      .select('id', { count: 'exact', head: true })
      .eq('friend_id', id)
      .eq('is_settled', false)

    if ((count ?? 0) > 0) {
      // Soft delete — preserve history
      const { error } = await supabase
        .from('friends')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('[deleteFriend soft]', error.message)
        return { error: 'Could not remove friend. Please try again.' }
      }

      // Remove from all groups
      await supabase
        .from('split_group_members')
        .delete()
        .eq('friend_id', id)

      revalidatePath('/splits')
      return { hasOpenSplits: true }
    }

    // No open splits — hard delete
    // Remove from groups first
    await supabase.from('split_group_members').delete().eq('friend_id', id)

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[deleteFriend hard]', error.message)
      return { error: 'Could not delete friend. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/splits')
  return {}
}

export async function getFriends() {
  try {
    const { supabase, user } = await getAuthUser()
    const { data, error } = await supabase
      .from('friends')
      .select('id, name, email, deleted_at, created_at')
      .eq('user_id', user.id)
      .order('name')

    if (error) {
      console.error('[getFriends]', error.message)
      return { friends: [], error: 'Could not load friends.' }
    }
    return { friends: data ?? [] }
  } catch {
    return { friends: [], error: 'Not authenticated.' }
  }
}

export async function getFriendsWithBalance() {
  try {
    const { supabase, user } = await getAuthUser()

    const { data: friends, error: fErr } = await supabase
      .from('friends')
      .select('id, name, email, deleted_at, created_at')
      .eq('user_id', user.id)
      .order('name')

    if (fErr) {
      console.error('[getFriendsWithBalance]', fErr.message)
      return { friends: [] }
    }

    const friendList = friends ?? []
    if (friendList.length === 0) return { friends: [] }

    // Get unsettled shares for each friend
    const { data: shares } = await supabase
      .from('split_shares')
      .select('friend_id, amount_owed')
      .eq('is_settled', false)
      .in(
        'friend_id',
        friendList.map((f) => f.id)
      )

    const balanceMap = new Map<string, number>()
    for (const share of shares ?? []) {
      const cur = balanceMap.get(share.friend_id) ?? 0
      balanceMap.set(share.friend_id, cur + share.amount_owed)
    }

    return {
      friends: friendList.map((f) => ({
        ...f,
        total_owed: balanceMap.get(f.id) ?? 0,
      })),
    }
  } catch {
    return { friends: [] }
  }
}
