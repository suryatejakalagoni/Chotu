import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PostForm } from '@/components/community/post-form'

export const metadata: Metadata = { title: 'Share Resource — CHOTU' }

export default async function NewPostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/community"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to community
          </Link>
          <h1 className="text-2xl font-bold mt-2">Share a resource</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Upload notes, papers, solutions or share a useful link with your classmates.
          </p>
        </div>
        <PostForm />
      </div>
    </div>
  )
}
