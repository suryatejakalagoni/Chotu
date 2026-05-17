import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CategoryManager } from '@/components/expenses/category-manager'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order('name')

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Categories</h1>
      <CategoryManager categories={categories ?? []} userId={user.id} />
    </div>
  )
}
