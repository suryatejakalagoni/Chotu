import type { Metadata } from 'next'
import Link from 'next/link'
import { getPendingReports } from '@/lib/actions/admin'
import { ReportsList } from '@/components/admin/reports-list'
import { getCommunityFeed } from '@/lib/actions/community'
import { PostCard } from '@/components/community/post-card'

export const metadata: Metadata = { title: 'Moderation — CHOTU Admin' }

export default async function AdminReportsPage() {
  const [reportsResult, feedResult] = await Promise.all([
    getPendingReports(),
    getCommunityFeed({ sort: 'newest', page: 1 }),
  ])

  const reports = 'error' in reportsResult ? [] : reportsResult.reports
  const allPosts = 'error' in feedResult ? [] : feedResult.posts

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-2">Moderation Dashboard</h1>
          <p className="text-muted-foreground text-sm">Admin only</p>
        </div>

        {/* Pending reports */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Pending reports
            {reports.length > 0 && (
              <span className="ml-2 text-sm font-normal bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {reports.length}
              </span>
            )}
          </h2>
          {'error' in reportsResult && (
            <p className="text-red-500 text-sm">{reportsResult.error}</p>
          )}
          <ReportsList reports={reports} />
        </section>

        {/* All posts (admin can delete any) */}
        <section>
          <h2 className="text-lg font-semibold mb-3">All posts</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Click any post to open it — as admin you can delete it from the post detail page.
          </p>
          {'error' in feedResult && (
            <p className="text-red-500 text-sm">{feedResult.error}</p>
          )}
          <div className="space-y-3">
            {allPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
