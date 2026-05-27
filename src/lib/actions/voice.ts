'use server'

import { revalidatePath } from 'next/cache'
import DOMPurify from 'isomorphic-dompurify'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { transcriptSchema, confirmVoiceSchema, undoVoiceSchema } from '@/lib/validations/voice'
import { parseVoice, getSpendingDateRange } from '@/lib/voice-parser'
import type { SpendingQueryResult } from '@/store/voice-store'

export type VoiceActionResult = {
  error?: string
  id?: string
  queryResult?: SpendingQueryResult
  infoMessage?: string
}

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return { supabase, user }
}

const VOICE_RATE_MAX  = 10
const VOICE_WINDOW_MS = 60 * 1_000

async function checkVoiceRateLimit(userId: string): Promise<boolean> {
  const admin      = createAdminClient()
  const windowStart = new Date(Date.now() - VOICE_WINDOW_MS).toISOString()
  const { count }  = await admin
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('key', `voice:${userId}`)
    .gte('attempted_at', windowStart)
  if ((count ?? 0) >= VOICE_RATE_MAX) return false
  await admin.from('rate_limits').insert({ key: `voice:${userId}` })
  return true
}

async function purgeOldVoiceEntries(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<void> {
  const { data: toKeep } = await admin
    .from('voice_entries')
    .select('id')
    .eq('user_id', userId)
    .neq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)

  if (!toKeep || toKeep.length < 50) return

  const keepIds = toKeep.map((r) => r.id)
  await admin
    .from('voice_entries')
    .delete()
    .eq('user_id', userId)
    .neq('status', 'pending')
    .not('id', 'in', `(${keepIds.join(',')})`)
}

function sanitize(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }).trim()
}

// ─── createVoiceEntry ─────────────────────────────────────────────────────────

export async function createVoiceEntry(rawTranscript: unknown): Promise<VoiceActionResult> {
  const parsed = transcriptSchema.safeParse({ transcript: rawTranscript })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }

  try {
    const { supabase, user } = await getAuthUser()

    const allowed = await checkVoiceRateLimit(user.id)
    if (!allowed) return { error: 'Too many voice requests. Please wait a minute.' }

    const cleanTranscript = sanitize(parsed.data.transcript)

    const { data, error } = await supabase
      .from('voice_entries')
      .insert({
        user_id:     user.id,
        transcript:  cleanTranscript,
        status:      'pending',
        storage_key: 'web-speech-api',
      })
      .select('id')
      .single()

    if (error) {
      console.error('[createVoiceEntry]', error.message)
      return { error: 'Could not save voice entry. Please try again.' }
    }

    return { id: data.id }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ─── processVoiceEntry ───────────────────────────────────────────────────────
// Single-call replacement for createVoiceEntry + confirmVoiceEntry.
// Modal opens instantly (client parses locally); this runs only on Confirm.

export async function processVoiceEntry(rawTranscript: unknown): Promise<VoiceActionResult> {
  const tParsed = transcriptSchema.safeParse({ transcript: rawTranscript })
  if (!tParsed.success) return { error: tParsed.error.issues[0]?.message ?? 'Invalid transcript.' }

  try {
    const { supabase, user } = await getAuthUser()

    const allowed = await checkVoiceRateLimit(user.id)
    if (!allowed) return { error: 'Too many voice requests. Please wait a minute.' }

    const cleanTranscript = sanitize(tParsed.data.transcript)
    const parsedAction    = parseVoice(cleanTranscript)
    const admin           = createAdminClient()
    const entryId         = crypto.randomUUID()

    // ── UNKNOWN ──────────────────────────────────────────────────────────────

    if (parsedAction.kind === 'unknown') {
      void admin.from('voice_entries').insert({
        id: entryId, user_id: user.id, transcript: cleanTranscript,
        status: 'failed', storage_key: 'web-speech-api',
        error_message: 'parse_failed',
        parsed_action: { kind: 'unknown', raw: cleanTranscript },
      })
      return { error: "Couldn't understand that command. Try: \"Spent 100 on lunch\"" }
    }

    // ── SPENDING QUERY — read-only ────────────────────────────────────────────

    if (parsedAction.kind === 'query_spending') {
      const now = new Date()
      const { start, end, label } = getSpendingDateRange(parsedAction.range, now)

      let expenseQuery = supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .gte('spent_at', start.toISOString())
        .lte('spent_at', end.toISOString())

      if (parsedAction.category_name) {
        const { data: cat } = await supabase
          .from('categories')
          .select('id')
          .ilike('name', parsedAction.category_name)
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .limit(1)
          .maybeSingle()
        if (cat) expenseQuery = expenseQuery.eq('category_id', cat.id)
      }

      const { data: rows } = await expenseQuery
      const total = (rows ?? []).reduce((sum, r) => sum + (r.amount as number), 0)
      const count = (rows ?? []).length

      void admin.from('voice_entries').insert({
        id: entryId, user_id: user.id, transcript: cleanTranscript,
        status: 'processed', storage_key: 'web-speech-api',
        parsed_action: { kind: 'query_spending', range: parsedAction.range, raw: cleanTranscript },
      })
      void purgeOldVoiceEntries(admin, user.id)

      return {
        id: entryId,
        queryResult: {
          total:    Math.round(total * 100) / 100,
          count,
          label,
          category: parsedAction.category_name,
        },
      }
    }

    // ── ATTENDANCE PLACEHOLDER ────────────────────────────────────────────────

    if (parsedAction.kind === 'attendance_placeholder') {
      void admin.from('voice_entries').insert({
        id: entryId, user_id: user.id, transcript: cleanTranscript,
        status: 'processed', storage_key: 'web-speech-api',
        parsed_action: {
          kind: 'attendance_placeholder', subject: parsedAction.subject,
          target_table: 'attendance_placeholder', raw: cleanTranscript,
        },
      })
      void purgeOldVoiceEntries(admin, user.id)
      return {
        id: entryId,
        infoMessage: `Attendance tracking is coming soon — "${parsedAction.subject}" wasn't logged.`,
      }
    }

    // ── EXPENSE ───────────────────────────────────────────────────────────────

    if (parsedAction.kind === 'expense') {
      const { amount, description, category_name } = parsedAction

      if (amount <= 0 || amount > 1_000_000)
        return { error: 'Invalid amount. Must be between ₹1 and ₹10,00,000.' }
      if (!description || description.length > 200)
        return { error: 'Invalid description.' }

      const { data: category } = await supabase
        .from('categories').select('id')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .ilike('name', category_name).limit(1).maybeSingle()

      const { data: expense, error: expErr } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id, title: sanitize(description), amount,
          category_id: category?.id ?? null,
          spent_at: new Date().toISOString(),
          notes: `Voice: "${cleanTranscript}"`,
        })
        .select('id').single()

      if (expErr || !expense) {
        console.error('[processVoiceEntry] expense insert', expErr?.message)
        return { error: 'Could not save the expense. Please try again.' }
      }

      await admin.from('voice_entries').insert({
        id: entryId, user_id: user.id, transcript: cleanTranscript,
        status: 'processed', storage_key: 'web-speech-api',
        parsed_action: {
          kind: 'expense', amount, description: sanitize(description),
          category: category_name, target_table: 'expenses',
          target_id: expense.id, raw: cleanTranscript,
        },
      })
      void purgeOldVoiceEntries(admin, user.id)
      revalidatePath('/dashboard')
      revalidatePath('/expenses')
      return { id: entryId }
    }

    // ── INCOME ────────────────────────────────────────────────────────────────

    if (parsedAction.kind === 'income') {
      const { amount, source, category_name } = parsedAction

      if (amount <= 0 || amount > 1_000_000)
        return { error: 'Invalid amount. Must be between ₹1 and ₹10,00,000.' }

      const { data: category } = await supabase
        .from('categories').select('id')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .ilike('name', category_name).limit(1).maybeSingle()

      const title       = source ? sanitize(source) : 'Income'
      const cleanSource = source ? sanitize(source) : null

      const { data: incomeRow, error: incErr } = await supabase
        .from('income')
        .insert({
          user_id: user.id, title, amount, source: cleanSource,
          category_id: category?.id ?? null,
          received_at: new Date().toISOString(),
          notes: `Voice: "${cleanTranscript}"`,
        })
        .select('id').single()

      if (incErr || !incomeRow) {
        console.error('[processVoiceEntry] income insert', incErr?.message)
        return { error: 'Could not save the income. Please try again.' }
      }

      await admin.from('voice_entries').insert({
        id: entryId, user_id: user.id, transcript: cleanTranscript,
        status: 'processed', storage_key: 'web-speech-api',
        parsed_action: {
          kind: 'income', amount, source: cleanSource, category: category_name,
          target_table: 'income', target_id: incomeRow.id, raw: cleanTranscript,
        },
      })
      void purgeOldVoiceEntries(admin, user.id)
      revalidatePath('/dashboard')
      revalidatePath('/expenses')
      return { id: entryId }
    }

    // ── ASSIGNMENT ────────────────────────────────────────────────────────────

    if (parsedAction.kind === 'assignment') {
      const { subject, title, due_at } = parsedAction

      if (!subject || subject.length > 100) return { error: 'Invalid subject.' }
      if (!title   || title.length   > 200) return { error: 'Invalid title.' }

      const now = new Date()
      const dueDelta = due_at.getTime() - now.getTime()
      if (dueDelta < 0 || dueDelta > 5 * 365 * 24 * 60 * 60 * 1000)
        return { error: 'Due date must be within the next 5 years.' }

      const { data: assignment, error: aErr } = await supabase
        .from('assignments')
        .insert({
          user_id: user.id, subject: sanitize(subject), title: sanitize(title),
          due_at: due_at.toISOString(), status: 'not_started',
          priority: 'medium', is_recurring: false,
        })
        .select('id').single()

      if (aErr || !assignment) {
        console.error('[processVoiceEntry] assignment insert', aErr?.message)
        return { error: 'Could not save the assignment. Please try again.' }
      }

      await admin.from('voice_entries').insert({
        id: entryId, user_id: user.id, transcript: cleanTranscript,
        status: 'processed', storage_key: 'web-speech-api',
        parsed_action: {
          kind: 'assignment', subject, title, due_at: due_at.toISOString(),
          target_table: 'assignments', target_id: assignment.id, raw: cleanTranscript,
        },
      })
      void purgeOldVoiceEntries(admin, user.id)
      revalidatePath('/dashboard')
      revalidatePath('/assignments')
      return { id: entryId }
    }

    // ── EXAM ──────────────────────────────────────────────────────────────────

    if (parsedAction.kind === 'exam') {
      const { subject, exam_type, exam_at } = parsedAction

      if (!subject   || subject.length   > 100) return { error: 'Invalid subject.' }
      if (!exam_type || exam_type.length  >  50) return { error: 'Invalid exam type.' }

      const now = new Date()
      const examDelta = exam_at.getTime() - now.getTime()
      if (examDelta < 0 || examDelta > 5 * 365 * 24 * 60 * 60 * 1000)
        return { error: 'Exam date must be within the next 5 years.' }

      const { data: exam, error: eErr } = await supabase
        .from('exams')
        .insert({
          user_id: user.id, subject: sanitize(subject),
          title: `${sanitize(subject)} — ${sanitize(exam_type)}`,
          exam_type: sanitize(exam_type), exam_at: exam_at.toISOString(), status: 'upcoming',
        })
        .select('id').single()

      if (eErr || !exam) {
        console.error('[processVoiceEntry] exam insert', eErr?.message)
        return { error: 'Could not save the exam. Please try again.' }
      }

      await admin.from('voice_entries').insert({
        id: entryId, user_id: user.id, transcript: cleanTranscript,
        status: 'processed', storage_key: 'web-speech-api',
        parsed_action: {
          kind: 'exam', subject, exam_type, exam_at: exam_at.toISOString(),
          target_table: 'exams', target_id: exam.id, raw: cleanTranscript,
        },
      })
      void purgeOldVoiceEntries(admin, user.id)
      revalidatePath('/dashboard')
      revalidatePath('/exams')
      return { id: entryId }
    }

    // ── CUSTOM REMINDER ───────────────────────────────────────────────────────

    if (parsedAction.kind === 'custom_reminder') {
      const { text, trigger_at } = parsedAction

      if (!text || text.length > 300) return { error: 'Invalid reminder text.' }

      const now = new Date()
      const triggerDelta = trigger_at.getTime() - now.getTime()
      if (triggerDelta < 0 || triggerDelta > 5 * 365 * 24 * 60 * 60 * 1000)
        return { error: 'Reminder time must be in the future and within 5 years.' }

      const cleanText = sanitize(text)

      const { data: notif, error: nErr } = await admin
        .from('notifications')
        .insert({
          user_id: user.id, title: cleanText.slice(0, 100), body: cleanText,
          type: 'custom_reminder', read: false,
          data: { text: cleanText, trigger_at: trigger_at.toISOString() },
        })
        .select('id').single()

      if (nErr || !notif) {
        console.error('[processVoiceEntry] notification insert', nErr?.message)
        return { error: 'Could not save the reminder. Please try again.' }
      }

      await admin.from('voice_entries').insert({
        id: entryId, user_id: user.id, transcript: cleanTranscript,
        status: 'processed', storage_key: 'web-speech-api',
        parsed_action: {
          kind: 'custom_reminder', text: cleanText, trigger_at: trigger_at.toISOString(),
          target_table: 'notifications', target_id: notif.id, raw: cleanTranscript,
        },
      })
      void purgeOldVoiceEntries(admin, user.id)
      return { id: entryId }
    }

    return { error: 'Unhandled action type.' }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ─── confirmVoiceEntry ────────────────────────────────────────────────────────

export async function confirmVoiceEntry(
  rawEntryId: unknown,
  rawTranscript: unknown,
): Promise<VoiceActionResult> {
  const idParsed = confirmVoiceSchema.safeParse({ voice_entry_id: rawEntryId })
  if (!idParsed.success) return { error: 'Invalid request.' }

  const tParsed = transcriptSchema.safeParse({ transcript: rawTranscript })
  if (!tParsed.success) return { error: tParsed.error.issues[0]?.message ?? 'Invalid transcript.' }

  try {
    const { supabase, user } = await getAuthUser()
    const admin              = createAdminClient()

    // Verify ownership + pending status
    const { data: entry, error: fetchErr } = await supabase
      .from('voice_entries')
      .select('id, status')
      .eq('id', idParsed.data.voice_entry_id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (fetchErr || !entry) {
      return { error: 'Voice entry not found or already processed.' }
    }

    const cleanTranscript = sanitize(tParsed.data.transcript)
    const parsedAction    = parseVoice(cleanTranscript)

    // ── UNKNOWN ──────────────────────────────────────────────────────────────

    if (parsedAction.kind === 'unknown') {
      await admin.from('voice_entries').update({
        status:        'failed',
        error_message: 'parse_failed',
        transcript:    cleanTranscript,
        parsed_action: { kind: 'unknown', raw: cleanTranscript },
      }).eq('id', entry.id)
      return { error: "Couldn't understand that command. Try: \"Spent 100 on lunch\"" }
    }

    // ── SPENDING QUERY — read-only, no DB write ───────────────────────────────

    if (parsedAction.kind === 'query_spending') {
      const now = new Date()
      const { start, end, label } = getSpendingDateRange(parsedAction.range, now)

      let expenseQuery = supabase
        .from('expenses')
        .select('amount')
        .eq('user_id', user.id)
        .gte('spent_at', start.toISOString())
        .lte('spent_at', end.toISOString())

      if (parsedAction.category_name) {
        const { data: cat } = await supabase
          .from('categories')
          .select('id')
          .ilike('name', parsedAction.category_name)
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .limit(1)
          .maybeSingle()
        if (cat) expenseQuery = expenseQuery.eq('category_id', cat.id)
      }

      const { data: rows } = await expenseQuery
      const total = (rows ?? []).reduce((sum, r) => sum + (r.amount as number), 0)
      const count = (rows ?? []).length

      await admin.from('voice_entries').update({
        status:        'processed',
        transcript:    cleanTranscript,
        parsed_action: { kind: 'query_spending', range: parsedAction.range, raw: cleanTranscript },
      }).eq('id', entry.id)

      void purgeOldVoiceEntries(admin, user.id)

      return {
        id:          entry.id,
        queryResult: {
          total:    Math.round(total * 100) / 100,
          count,
          label,
          category: parsedAction.category_name,
        },
      }
    }

    // ── ATTENDANCE PLACEHOLDER ────────────────────────────────────────────────

    if (parsedAction.kind === 'attendance_placeholder') {
      await admin.from('voice_entries').update({
        status:        'processed',
        transcript:    cleanTranscript,
        parsed_action: {
          kind:         'attendance_placeholder',
          subject:      parsedAction.subject,
          target_table: 'attendance_placeholder',
          raw:          cleanTranscript,
        },
      }).eq('id', entry.id)

      void purgeOldVoiceEntries(admin, user.id)

      return {
        id:          entry.id,
        infoMessage: `Attendance tracking is coming soon — "${parsedAction.subject}" wasn't logged.`,
      }
    }

    // ── EXPENSE ───────────────────────────────────────────────────────────────

    if (parsedAction.kind === 'expense') {
      const { amount, description, category_name } = parsedAction

      if (amount <= 0 || amount > 1_000_000) {
        return { error: 'Invalid amount. Must be between ₹1 and ₹10,00,000.' }
      }
      if (!description || description.length > 200) {
        return { error: 'Invalid description.' }
      }

      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .ilike('name', category_name)
        .limit(1)
        .maybeSingle()

      const { data: expense, error: expErr } = await supabase
        .from('expenses')
        .insert({
          user_id:     user.id,
          title:       sanitize(description),
          amount,
          category_id: category?.id ?? null,
          spent_at:    new Date().toISOString(),
          notes:       `Voice: "${cleanTranscript}"`,
        })
        .select('id')
        .single()

      if (expErr || !expense) {
        console.error('[confirmVoiceEntry] expense insert', expErr?.message)
        return { error: 'Could not save the expense. Please try again.' }
      }

      await admin.from('voice_entries').update({
        status:        'processed',
        transcript:    cleanTranscript,
        parsed_action: {
          kind:         'expense',
          amount,
          description:  sanitize(description),
          category:     category_name,
          target_table: 'expenses',
          target_id:    expense.id,
          raw:          cleanTranscript,
        },
      }).eq('id', entry.id)

      void purgeOldVoiceEntries(admin, user.id)
      revalidatePath('/dashboard')
      revalidatePath('/expenses')
      return { id: entry.id }
    }

    // ── INCOME ────────────────────────────────────────────────────────────────

    if (parsedAction.kind === 'income') {
      const { amount, source, category_name } = parsedAction

      if (amount <= 0 || amount > 1_000_000) {
        return { error: 'Invalid amount. Must be between ₹1 and ₹10,00,000.' }
      }

      const { data: category } = await supabase
        .from('categories')
        .select('id')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .ilike('name', category_name)
        .limit(1)
        .maybeSingle()

      const title = source ? sanitize(source) : 'Income'
      const cleanSource = source ? sanitize(source) : null

      const { data: incomeRow, error: incErr } = await supabase
        .from('income')
        .insert({
          user_id:     user.id,
          title,
          amount,
          source:      cleanSource,
          category_id: category?.id ?? null,
          received_at: new Date().toISOString(),
          notes:       `Voice: "${cleanTranscript}"`,
        })
        .select('id')
        .single()

      if (incErr || !incomeRow) {
        console.error('[confirmVoiceEntry] income insert', incErr?.message)
        return { error: 'Could not save the income. Please try again.' }
      }

      await admin.from('voice_entries').update({
        status:        'processed',
        transcript:    cleanTranscript,
        parsed_action: {
          kind:         'income',
          amount,
          source:       cleanSource,
          category:     category_name,
          target_table: 'income',
          target_id:    incomeRow.id,
          raw:          cleanTranscript,
        },
      }).eq('id', entry.id)

      void purgeOldVoiceEntries(admin, user.id)
      revalidatePath('/dashboard')
      revalidatePath('/expenses')
      return { id: entry.id }
    }

    // ── ASSIGNMENT ────────────────────────────────────────────────────────────

    if (parsedAction.kind === 'assignment') {
      const { subject, title, due_at } = parsedAction

      if (!subject || subject.length > 100) return { error: 'Invalid subject.' }
      if (!title   || title.length   > 200) return { error: 'Invalid title.' }

      const now = new Date()
      const dueDelta = due_at.getTime() - now.getTime()
      if (dueDelta < 0 || dueDelta > 5 * 365 * 24 * 60 * 60 * 1000) {
        return { error: 'Due date must be within the next 5 years.' }
      }

      const { data: assignment, error: aErr } = await supabase
        .from('assignments')
        .insert({
          user_id:      user.id,
          subject:      sanitize(subject),
          title:        sanitize(title),
          due_at:       due_at.toISOString(),
          status:       'not_started',
          priority:     'medium',
          is_recurring: false,
        })
        .select('id')
        .single()

      if (aErr || !assignment) {
        console.error('[confirmVoiceEntry] assignment insert', aErr?.message)
        return { error: 'Could not save the assignment. Please try again.' }
      }

      await admin.from('voice_entries').update({
        status:        'processed',
        transcript:    cleanTranscript,
        parsed_action: {
          kind:         'assignment',
          subject,
          title,
          due_at:       due_at.toISOString(),
          target_table: 'assignments',
          target_id:    assignment.id,
          raw:          cleanTranscript,
        },
      }).eq('id', entry.id)

      void purgeOldVoiceEntries(admin, user.id)
      revalidatePath('/dashboard')
      revalidatePath('/assignments')
      return { id: entry.id }
    }

    // ── EXAM ──────────────────────────────────────────────────────────────────

    if (parsedAction.kind === 'exam') {
      const { subject, exam_type, exam_at } = parsedAction

      if (!subject   || subject.length   > 100) return { error: 'Invalid subject.' }
      if (!exam_type || exam_type.length  >  50) return { error: 'Invalid exam type.' }

      const now = new Date()
      const examDelta = exam_at.getTime() - now.getTime()
      if (examDelta < 0 || examDelta > 5 * 365 * 24 * 60 * 60 * 1000) {
        return { error: 'Exam date must be within the next 5 years.' }
      }

      const { data: exam, error: eErr } = await supabase
        .from('exams')
        .insert({
          user_id:   user.id,
          subject:   sanitize(subject),
          title:     `${sanitize(subject)} — ${sanitize(exam_type)}`,
          exam_type: sanitize(exam_type),
          exam_at:   exam_at.toISOString(),
          status:    'upcoming',
        })
        .select('id')
        .single()

      if (eErr || !exam) {
        console.error('[confirmVoiceEntry] exam insert', eErr?.message)
        return { error: 'Could not save the exam. Please try again.' }
      }

      await admin.from('voice_entries').update({
        status:        'processed',
        transcript:    cleanTranscript,
        parsed_action: {
          kind:         'exam',
          subject,
          exam_type,
          exam_at:      exam_at.toISOString(),
          target_table: 'exams',
          target_id:    exam.id,
          raw:          cleanTranscript,
        },
      }).eq('id', entry.id)

      void purgeOldVoiceEntries(admin, user.id)
      revalidatePath('/dashboard')
      revalidatePath('/exams')
      return { id: entry.id }
    }

    // ── CUSTOM REMINDER ───────────────────────────────────────────────────────

    if (parsedAction.kind === 'custom_reminder') {
      const { text, trigger_at } = parsedAction

      if (!text || text.length > 300) return { error: 'Invalid reminder text.' }

      const now = new Date()
      const triggerDelta = trigger_at.getTime() - now.getTime()
      if (triggerDelta < 0 || triggerDelta > 5 * 365 * 24 * 60 * 60 * 1000) {
        return { error: 'Reminder time must be in the future and within 5 years.' }
      }

      const cleanText = sanitize(text)

      // Notifications insert requires service role (RLS: insert by service role only)
      const { data: notif, error: nErr } = await admin
        .from('notifications')
        .insert({
          user_id: user.id,
          title:   cleanText.slice(0, 100),
          body:    cleanText,
          type:    'custom_reminder',
          read:    false,
          data:    { text: cleanText, trigger_at: trigger_at.toISOString() },
        })
        .select('id')
        .single()

      if (nErr || !notif) {
        console.error('[confirmVoiceEntry] notification insert', nErr?.message)
        return { error: 'Could not save the reminder. Please try again.' }
      }

      await admin.from('voice_entries').update({
        status:        'processed',
        transcript:    cleanTranscript,
        parsed_action: {
          kind:         'custom_reminder',
          text:         cleanText,
          trigger_at:   trigger_at.toISOString(),
          target_table: 'notifications',
          target_id:    notif.id,
          raw:          cleanTranscript,
        },
      }).eq('id', entry.id)

      void purgeOldVoiceEntries(admin, user.id)
      return { id: entry.id }
    }

    return { error: 'Unhandled action type.' }
  } catch {
    return { error: 'Not authenticated.' }
  }
}

// ─── undoVoiceEntry ───────────────────────────────────────────────────────────

export async function undoVoiceEntry(rawEntryId: unknown): Promise<VoiceActionResult> {
  const parsed = undoVoiceSchema.safeParse({ voice_entry_id: rawEntryId })
  if (!parsed.success) return { error: 'Invalid request.' }

  try {
    const { supabase, user } = await getAuthUser()
    const admin              = createAdminClient()

    const { data: entry, error: fetchErr } = await supabase
      .from('voice_entries')
      .select('id, parsed_action')
      .eq('id', parsed.data.voice_entry_id)
      .eq('user_id', user.id)
      .eq('status', 'processed')
      .single()

    if (fetchErr || !entry) {
      return { error: 'Entry not found or already undone.' }
    }

    // Must be the most recent processed entry
    const { data: mostRecent } = await supabase
      .from('voice_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'processed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (mostRecent?.id !== entry.id) {
      return { error: 'Can only undo the most recent voice entry.' }
    }

    const action = entry.parsed_action as Record<string, unknown> | null
    if (!action?.target_table || !action?.target_id) {
      return { error: 'This entry cannot be undone.' }
    }

    const table    = action.target_table as string
    const targetId = action.target_id   as string

    const undoableTables: Record<string, string> = {
      expenses:      '/expenses',
      income:        '/expenses',
      assignments:   '/assignments',
      exams:         '/exams',
      notifications: '',
    }

    if (!(table in undoableTables)) {
      return { error: 'This entry type cannot be undone.' }
    }

    const { error: deleteErr } = await supabase
      .from(table as 'expenses' | 'income' | 'assignments' | 'exams' | 'notifications')
      .delete()
      .eq('id', targetId)
      .eq('user_id', user.id)

    if (deleteErr) {
      console.error('[undoVoiceEntry] delete', deleteErr.message)
      return { error: 'Could not undo the entry. Please try again.' }
    }

    await admin
      .from('voice_entries')
      .update({ status: 'failed', error_message: 'undone' })
      .eq('id', entry.id)

    revalidatePath('/dashboard')
    const revalidateTarget = undoableTables[table]
    if (revalidateTarget) revalidatePath(revalidateTarget)

    return {}
  } catch {
    return { error: 'Not authenticated.' }
  }
}
