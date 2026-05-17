import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { contentTypeLabel, contentTypeBadgeClass } from '@/lib/community-utils'

export async function CommunityDashboardWidget() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recent } = await supabase
    .from('community_posts')
    .select('id, title, content_type, subject_tag, created_at')
    .is('deleted_at', null)
    .gte('created_at', oneWeekAgo)
    .order('created_at', { ascending: false })
    .limit(3)

  const { count: totalThisWeek } = await supabase
    .from('community_posts')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .gte('created_at', oneWeekAgo)

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">Community Hub</h2>
        <Link
          href="/community"
          className="text-xs text-primary hover:underline"
        >
          View all →
        </Link>
      </div>

      {(!recent || recent.length === 0) ? (
        <p className="text-sm text-muted-foreground">
          No new posts this week.{' '}
          <Link href="/community/new" className="text-primary hover:underline">
            Share something!
          </Link>
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {totalThisWeek ?? 0} new {(totalThisWeek ?? 0) === 1 ? 'post' : 'posts'} this week
          </p>
          <ul className="space-y-2">
            {recent.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/community/${post.id}`}
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${contentTypeBadgeClass(post.content_type as Parameters<typeof contentTypeBadgeClass>[0])}`}>
                    {contentTypeLabel(post.content_type as Parameters<typeof contentTypeLabel>[0])}
                  </span>
                  <span className="line-clamp-1 flex-1">{post.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
