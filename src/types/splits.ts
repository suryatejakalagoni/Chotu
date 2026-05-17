export type FriendWithBalance = {
  id: string
  name: string
  email: string | null
  deleted_at: string | null
  created_at: string
  total_owed: number // sum of unsettled amount_owed for this friend
}

export type GroupWithBalance = {
  id: string
  name: string
  description: string | null
  member_count: number
  total_owed: number // sum of unsettled shares across all splits linked to this group
}

export type ShareWithFriend = {
  id: string
  friend_id: string
  friend_name: string
  amount_owed: number
  is_settled: boolean
  settled_at: string | null
}

export type SplitWithShares = {
  id: string
  title: string
  description: string | null
  total_amount: number
  paid_at: string
  group_id: string | null
  group_name: string | null
  status: 'pending' | 'settled'
  created_at: string
  shares: ShareWithFriend[]
}
