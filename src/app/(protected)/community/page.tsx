import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCommunityFeed } from '@/lib/actions/community'
import { PostCard } from '@/components/community/post-card'
import { PostFilters } from '@/components/community/post-filters'
import { buttonVariants } from '@/components/ui/button'
import { PAGE_SIZE } from '@/lib/validations/community'

export const metadata: Metadata = { title: 'Community — CHOTU' }

interface PageProps {
  searchParams: Promise<{
    sort?: string
    content_type?: string
    subject_tag?: string
    search?: string
    page?: string
  }>
}

export default async function CommunityPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? '1', 10))

  const result = await getCommunityFeed({
    sort:         sp.sort ?? 'newest',
    content_type: sp.content_type || undefined,
    subject_tag:  sp.subject_tag || undefined,
    search:       sp.search || undefined,
    page,
  })

  const posts = 'error' in result ? [] : result.posts
  const total = 'error' in result ? 0 : result.total
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function pageUrl(p: number) {
    const params = new URLSearchParams({
      ...(sp.sort && { sort: sp.sort }),
      ...(sp.content_type && { content_type: sp.content_type }),
      ...(sp.subject_tag && { subject_tag: sp.subject_tag }),
      ...(sp.search && { search: sp.search }),
      page: String(p),
    })
    return `/community?${params.toString()}`
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Community Hub</h1>
            <p className="text-muted-foreground text-sm">
              Notes, papers, solutions shared by classmates
            </p>
          </div>
          <Link href="/community/new" className={buttonVariants()}>+ Share</Link>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <Suspense>
            <PostFilters />
          </Suspense>
        </div>

        {/* Feed */}
        {'error' in result && (
          <p className="text-red-500 text-sm">{result.error}</p>
        )}

        {posts.length === 0 && !('error' in result) && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">No posts yet</p>
            <p className="text-sm mt-1">Be the first to share something!</p>
          </div>
        )}

        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                className="px-3 py-1 rounded border text-sm hover:bg-muted"
              >
                ← Prev
              </Link>
            )}
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1)}
                className="px-3 py-1 rounded border text-sm hover:bg-muted"
              >
                Next →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
