import type { ContentType } from '@/lib/validations/community'

export type { ContentType }

export interface PostWithMeta {
  id: string
  title: string
  subject_tag: string | null
  content_type: ContentType
  description: string | null
  storage_key: string | null
  external_url: string | null
  is_anonymous: boolean
  is_pinned: boolean
  expires_at: string | null
  deleted_at: string | null
  download_count: number
  created_at: string
  updated_at: string
  user_id: string
  // joined
  uploader_name: string | null   // null when is_anonymous
  vote_score: number             // sum of values from community_votes
  my_vote: 1 | -1 | null        // current user's vote, null if none
  comment_count: number
}

export interface CommentWithReplies {
  id: string
  post_id: string
  parent_id: string | null
  content: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  user_id: string
  author_name: string
  replies: CommentWithReplies[]
}

export interface ReportWithTarget {
  id: string
  reporter_id: string
  reporter_name: string
  post_id: string | null
  comment_id: string | null
  reason: string
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  // joined target preview
  target_title: string | null   // post title or comment excerpt
  target_author: string | null
}
