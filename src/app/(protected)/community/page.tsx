import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCommunityFeed } from '@/lib/actions/community'
import { CommunityClient } from '@/components/community/CommunityClient'

export const metadata: Metadata = { title: 'Community — CHOTU' }

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const result = await getCommunityFeed({
    sort: 'newest',
    page: 1,
  })

  const posts = 'error' in result ? [] : result.posts

  return (
    <CommunityClient
      initialPosts={posts}
      userId={user.id}
    />
  )
}
