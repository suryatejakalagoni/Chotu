'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  expenseSchema,
  incomeSchema,
  categorySchema,
  budgetSchema,
} from '@/lib/validations/expenses'

// ─── helpers ────────────────────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, user }
}

/** Convert "YYYY-MM" to first and last day of that month as ISO date strings */
function monthBounds(month: string): { starts_at: string; ends_at: string } {
  const [year, mon] = month.split('-').map(Number)
  const first = new Date(year, mon - 1, 1)
  const last = new Date(year, mon, 0) // day 0 of next month = last day of current
  return {
    starts_at: first.toISOString().slice(0, 10),
    ends_at: last.toISOString().slice(0, 10),
  }
}

// ─── expense actions ─────────────────────────────────────────────────────────

export type ActionResult = { error?: string; id?: string }

export async function addExpense(raw: unknown): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()
    const { title, amount, category_id, spent_at, payment_method, notes } = parsed.data

    const { data, error } = await supabase.from('expenses').insert({
      user_id: user.id,
      title,
      amount,
      category_id: category_id ?? null,
      spent_at: new Date(spent_at).toISOString(),
      payment_method,
      notes: notes || null,
    }).select('id').single()

    if (error) {
      console.error('[addExpense]', error.message)
      return { error: 'Could not save expense. Please try again.' }
    }

    revalidatePath('/expenses')
    return { id: data.id }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

export async function updateExpense(id: string, raw: unknown): Promise<ActionResult> {
  if (!id) return { error: 'Invalid expense.' }
  const parsed = expenseSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()
    const { title, amount, category_id, spent_at, payment_method, notes } = parsed.data

    const { error } = await supabase
      .from('expenses')
      .update({
        title,
        amount,
        category_id: category_id ?? null,
        spent_at: new Date(spent_at).toISOString(),
        payment_method,
        notes: notes || null,
      })
      .eq('id', id)
      .eq('user_id', user.id) // belt-and-suspenders; RLS also enforces this

    if (error) {
      console.error('[updateExpense]', error.message)
      return { error: 'Could not update expense. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/expenses')
  return {}
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  if (!id) return { error: 'Invalid expense.' }

  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[deleteExpense]', error.message)
      return { error: 'Could not delete expense. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/expenses')
  return {}
}

// ─── income actions ───────────────────────────────────────────────────────────

export async function addIncome(raw: unknown): Promise<ActionResult> {
  const parsed = incomeSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()
    const { title, amount, source, category_id, received_at, notes } = parsed.data

    const { error } = await supabase.from('income').insert({
      user_id: user.id,
      title,
      amount,
      source: source ?? null,
      category_id: category_id ?? null,
      received_at: new Date(received_at).toISOString(),
      notes: notes ?? null,
    })

    if (error) {
      console.error('[addIncome]', error.message)
      return { error: 'Could not save income. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/expenses/income')
  revalidatePath('/dashboard')
  return {}
}

export async function updateIncome(id: string, raw: unknown): Promise<ActionResult> {
  if (!id) return { error: 'Invalid income entry.' }
  const parsed = incomeSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()
    const { title, amount, source, category_id, received_at, notes } = parsed.data

    const { error } = await supabase
      .from('income')
      .update({
        title,
        amount,
        source: source || null,
        category_id: category_id ?? null,
        received_at: new Date(received_at).toISOString(),
        notes: notes || null,
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[updateIncome]', error.message)
      return { error: 'Could not update income. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/expenses/income')
  revalidatePath('/dashboard')
  return {}
}

export async function deleteIncome(id: string): Promise<ActionResult> {
  if (!id) return { error: 'Invalid income entry.' }

  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase
      .from('income')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[deleteIncome]', error.message)
      return { error: 'Could not delete entry. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/expenses/income')
  revalidatePath('/dashboard')
  return {}
}

// ─── category actions ─────────────────────────────────────────────────────────

export async function addCategory(raw: unknown): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()
    const { name, color, type } = parsed.data

    // Check for duplicate name for this user
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', name)
      .maybeSingle()

    if (existing) return { error: 'You already have a category with this name.' }

    const { error } = await supabase.from('categories').insert({
      user_id: user.id,
      name,
      color,
      type,
    })

    if (error) {
      console.error('[addCategory]', error.message)
      return { error: 'Could not add category. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/expenses/categories')
  revalidatePath('/expenses')
  return {}
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  if (!id) return { error: 'Invalid category.' }

  try {
    const { supabase, user } = await getAuthUser()

    // Only delete user-owned categories (user_id = user.id), never global ones
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[deleteCategory]', error.message)
      return { error: 'Could not delete category. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/expenses/categories')
  revalidatePath('/expenses')
  return {}
}

// ─── budget actions ───────────────────────────────────────────────────────────

export async function upsertBudget(raw: unknown): Promise<ActionResult> {
  const parsed = budgetSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' }

  try {
    const { supabase, user } = await getAuthUser()
    const { name, amount, category_id, month } = parsed.data
    const { starts_at, ends_at } = monthBounds(month)

    // Check if a budget already exists for same scope + month
    let query = supabase
      .from('budgets')
      .select('id')
      .eq('user_id', user.id)
      .eq('starts_at', starts_at)

    if (category_id) {
      query = query.eq('category_id', category_id)
    } else {
      query = query.is('category_id', null)
    }

    const { data: existing } = await query.maybeSingle()

    if (existing) {
      // Update existing budget
      const { error } = await supabase
        .from('budgets')
        .update({ name, amount, ends_at })
        .eq('id', existing.id)
        .eq('user_id', user.id)

      if (error) {
        console.error('[upsertBudget update]', error.message)
        return { error: 'Could not update budget. Please try again.' }
      }
    } else {
      // Insert new budget
      const { error } = await supabase.from('budgets').insert({
        user_id: user.id,
        name,
        amount,
        category_id: category_id ?? null,
        period: 'monthly',
        starts_at,
        ends_at,
      })

      if (error) {
        console.error('[upsertBudget insert]', error.message)
        return { error: 'Could not create budget. Please try again.' }
      }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/expenses/budgets')
  revalidatePath('/dashboard')
  return {}
}

export async function deleteBudget(id: string): Promise<ActionResult> {
  if (!id) return { error: 'Invalid budget.' }

  try {
    const { supabase, user } = await getAuthUser()
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[deleteBudget]', error.message)
      return { error: 'Could not delete budget. Please try again.' }
    }
  } catch {
    return { error: 'Not authenticated.' }
  }

  revalidatePath('/expenses/budgets')
  revalidatePath('/dashboard')
  return {}
}
