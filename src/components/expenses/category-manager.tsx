'use client'

import { useState } from 'react'
import { deleteCategory } from '@/lib/actions/expenses'
import { CategoryForm } from './category-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Database } from '@/types/database.types'

type Category = Database['public']['Tables']['categories']['Row']

interface Props {
  categories: Category[]
  userId: string
}

export function CategoryManager({ categories, userId }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const systemCats = categories.filter((c) => c.user_id === null)
  const userCats = categories.filter((c) => c.user_id === userId)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? Existing expenses won\'t be deleted.')) return
    setDeletingId(id)
    setError(null)
    const result = await deleteCategory(id)
    if (result.error) setError(result.error)
    setDeletingId(null)
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* User custom categories */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">My Categories</h2>
          <Button size="sm" onClick={() => setFormOpen(true)}>+ Add</Button>
        </div>

        {userCats.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No custom categories yet. Add one above.
          </p>
        ) : (
          <div className="space-y-2">
            {userCats.map((cat) => (
              <Card key={cat.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-5 h-5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color ?? '#6366f1' }}
                    />
                    <div>
                      <span className="font-medium">{cat.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground capitalize">
                        {cat.type}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={deletingId === cat.id}
                    onClick={() => handleDelete(cat.id)}
                  >
                    {deletingId === cat.id ? '...' : 'Delete'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* System default categories (read-only) */}
      <div>
        <h2 className="font-semibold mb-3">Default Categories</h2>
        <div className="space-y-2">
          {systemCats.map((cat) => (
            <Card key={cat.id} className="opacity-75">
              <CardContent className="p-3 flex items-center gap-3">
                <span
                  className="w-5 h-5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color ?? '#94a3b8' }}
                />
                <span className="font-medium">{cat.name}</span>
                <span className="ml-auto text-xs text-muted-foreground capitalize">
                  {cat.type}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <CategoryForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  )
}
