'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { groupSchema } from '@/lib/validations/splits'

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

export async function createGroup(
  raw: unknown
): Promise<ActionResult & { id?: string }> {
  const parsed = groupSchema.safeParse(raw)
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()
    const { name, description } = parsed.data

    // Unique name per user
    const { data: existing } = await supabase
      .from('split_groups')
      .select('id')
      .eq('owner_id', user.id)
      .ilike('name', name)
      .maybeSingle()

    if (existing) return { error: 'You already have a group with this name.' }

    const { data, error } = await supabase
      .from('split_groups')
      .insert({ owner_id: user.id, name, description: description || null })
      .select('id')
      .single()

    if (error) {
      console.error('[createGroup]', error.message)
      return { error: 'Could not create group. Please try again.' }
    }

    revalidatePath('/splits')
    return { id: data.id }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function updateGroup(
  id: string,
  raw: unknown
): Promise<ActionResult> {
  if (!id) return { error: 'Invalid group.' }
  const parsed = groupSchema.safeParse(raw)
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()
    const { name, description } = parsed.data

    // Check duplicate name (exclude self)
    const { data: existing } = await supabase
      .from('split_groups')
      .select('id')
      .eq('owner_id', user.id)
      .ilike('name', name)
      .neq('id', id)
      .maybeSingle()

    if (existing) return { error: 'You already have a group with this name.' }

    const { error } = await supabase
      .from('split_groups')
      .update({ name, description: description || null })
      .eq('id', id)
      .eq('owner_id', user.id)

    if (error) {
      console.error('[updateGroup]', error.message)
      return { error: 'Could not update group. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/splits')
  return {}
}

export async function deleteGroup(id: string): Promise<ActionResult> {
  if (!id) return { error: 'Invalid group.' }

  try {
    const { supabase, user } = await getAuthUser()

    // Check for pending splits in this group
    const { count } = await supabase
      .from('splits')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', id)
      .eq('status', 'pending')

    if ((count ?? 0) > 0) {
      return {
        error: 'Settle all pending splits in this group before deleting it.',
      }
    }

    const { error } = await supabase
      .from('split_groups')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id)

    if (error) {
      console.error('[deleteGroup]', error.message)
      return { error: 'Could not delete group. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/splits')
  return {}
}

export async function addMemberToGroup(
  groupId: string,
  friendId: string
): Promise<ActionResult> {
  if (!groupId || !friendId) return { error: 'Invalid input.' }

  try {
    const { supabase, user } = await getAuthUser()

    // Verify group ownership
    const { data: group } = await supabase
      .from('split_groups')
      .select('id')
      .eq('id', groupId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!group) return { error: 'Group not found.' }

    // Verify friend belongs to current user
    const { data: friend } = await supabase
      .from('friends')
      .select('id')
      .eq('id', friendId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!friend) return { error: 'Friend not found.' }

    // Check already a member
    const { data: existing } = await supabase
      .from('split_group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('friend_id', friendId)
      .maybeSingle()

    if (existing) return { error: 'Already in this group.' }

    const { error } = await supabase
      .from('split_group_members')
      .insert({ group_id: groupId, friend_id: friendId })

    if (error) {
      console.error('[addMemberToGroup]', error.message)
      return { error: 'Could not add member. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/splits')
  return {}
}

export async function removeMemberFromGroup(
  groupId: string,
  friendId: string
): Promise<ActionResult> {
  if (!groupId || !friendId) return { error: 'Invalid input.' }

  try {
    const { supabase, user } = await getAuthUser()

    // Verify group ownership
    const { data: group } = await supabase
      .from('split_groups')
      .select('id')
      .eq('id', groupId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!group) return { error: 'Group not found.' }

    const { error } = await supabase
      .from('split_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('friend_id', friendId)

    if (error) {
      console.error('[removeMemberFromGroup]', error.message)
      return { error: 'Could not remove member. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/splits')
  return {}
}

export async function getGroupsWithBalance() {
  try {
    const { supabase, user } = await getAuthUser()

    const { data: groups, error: gErr } = await supabase
      .from('split_groups')
      .select('id, name, description')
      .eq('owner_id', user.id)
      .order('name')

    if (gErr) {
      console.error('[getGroupsWithBalance]', gErr.message)
      return { groups: [] }
    }

    const groupList = groups ?? []
    const groupIds = groupList.map((g) => g.id)
    if (groupIds.length === 0) return { groups: [] }

    // Get member counts
    const { data: members } = await supabase
      .from('split_group_members')
      .select('group_id, friend_id')
      .in('group_id', groupIds)

    // Get unsettled shares via splits linked to these groups
    const { data: pendingSplits } = await supabase
      .from('splits')
      .select('id, group_id')
      .in('group_id', groupIds)
      .eq('status', 'pending')

    const pendingSplitIds = (pendingSplits ?? []).map((s) => s.id)
    let shares: Array<{ split_id: string; amount_owed: number }> = []

    if (pendingSplitIds.length > 0) {
      const { data: sharesData } = await supabase
        .from('split_shares')
        .select('split_id, amount_owed')
        .in('split_id', pendingSplitIds)
        .eq('is_settled', false)
      shares = sharesData ?? []
    }

    // Build split_id → group_id map
    const splitToGroup = new Map<string, string>()
    for (const s of pendingSplits ?? []) {
      if (s.group_id) splitToGroup.set(s.id, s.group_id)
    }

    // Aggregate
    const memberCountMap = new Map<string, number>()
    const balanceMap = new Map<string, number>()

    for (const m of members ?? []) {
      memberCountMap.set(m.group_id, (memberCountMap.get(m.group_id) ?? 0) + 1)
    }

    for (const s of shares) {
      const gId = splitToGroup.get(s.split_id)
      if (gId) {
        balanceMap.set(gId, (balanceMap.get(gId) ?? 0) + s.amount_owed)
      }
    }

    return {
      groups: groupList.map((g) => ({
        ...g,
        member_count: memberCountMap.get(g.id) ?? 0,
        total_owed: balanceMap.get(g.id) ?? 0,
      })),
    }
  } catch {
    return { groups: [] }
  }
}

export async function getGroupMembers(groupId: string) {
  try {
    const { supabase, user } = await getAuthUser()

    // Verify ownership
    const { data: group } = await supabase
      .from('split_groups')
      .select('id')
      .eq('id', groupId)
      .eq('owner_id', user.id)
      .maybeSingle()

    if (!group) return { members: [] }

    const { data, error } = await supabase
      .from('split_group_members')
      .select('id, friend_id, joined_at, friends(id, name)')
      .eq('group_id', groupId)
      .order('joined_at')

    if (error) {
      console.error('[getGroupMembers]', error.message)
      return { members: [] }
    }

    return {
      members: (data ?? []).map((m) => ({
        id: m.id,
        friend_id: m.friend_id,
        joined_at: m.joined_at,
        name:
          (m.friends as unknown as { name: string } | null)?.name ?? 'Unknown',
      })),
    }
  } catch {
    return { members: [] }
  }
}
