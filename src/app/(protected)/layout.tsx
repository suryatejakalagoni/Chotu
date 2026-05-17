import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/layout/top-bar'
import { BottomNav } from '@/components/layout/bottom-nav'

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, is_admin')
    .eq('id', user.id)
    .single()

  const isAdmin  = profile?.is_admin ?? false
  const userName = profile?.display_name ?? user.email?.split('@')[0] ?? ''

  return (
    <div className="min-h-screen bg-background">
      <TopBar isAdmin={isAdmin} userName={userName} />
      {/* pb-14 on mobile so bottom nav doesn't cover content */}
      <div className="pb-14 lg:pb-0">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
