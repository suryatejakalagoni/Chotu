import type { ContentType } from '@/types/community'

// ── Expiry helpers ────────────────────────────────────────────

export type ExpiryOption = '7d' | '30d' | '90d' | 'semester' | 'never'

export function expiryOptionToDate(option: ExpiryOption): string | null {
  if (option === 'never') return null
  const now = new Date()
  if (option === '7d')  { now.setDate(now.getDate() + 7);   return now.toISOString() }
  if (option === '30d') { now.setDate(now.getDate() + 30);  return now.toISOString() }
  if (option === '90d') { now.setDate(now.getDate() + 90);  return now.toISOString() }
  // 'semester': end of current academic semester (next April 30 or Oct 31)
  const month = now.getMonth() // 0-indexed
  const year  = now.getFullYear()
  const semEnd = month < 9
    ? new Date(year, 9, 31)    // Oct 31 (odd semester)
    : new Date(year + 1, 3, 30) // Apr 30 next year (even semester)
  return semEnd.toISOString()
}

export function expiryCountdown(expiresAt: string | null): string {
  if (!expiresAt) return 'Never expires'
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days > 1)  return `Expires in ${days} days`
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours > 1) return `Expires in ${hours} hours`
  return 'Expires soon'
}

// ── Content type labels ────────────────────────────────────────

const CT_LABELS: Record<ContentType, string> = {
  assignment: 'Assignment',
  solution:   'Solution',
  paper:      'Question Paper',
  notes:      'Notes',
  syllabus:   'Syllabus',
  link:       'Link / Resource',
}

export function contentTypeLabel(ct: ContentType): string {
  return CT_LABELS[ct] ?? ct
}

const CT_COLORS: Record<ContentType, string> = {
  assignment: 'bg-blue-100 text-blue-800',
  solution:   'bg-green-100 text-green-800',
  paper:      'bg-purple-100 text-purple-800',
  notes:      'bg-yellow-100 text-yellow-800',
  syllabus:   'bg-orange-100 text-orange-800',
  link:       'bg-gray-100 text-gray-700',
}

export function contentTypeBadgeClass(ct: ContentType): string {
  return CT_COLORS[ct] ?? 'bg-gray-100 text-gray-700'
}

// ── Popular score (Tier 2) ────────────────────────────────────
// Simple score: vote_score + log10(download_count + 1)
export function popularScore(voteScore: number, downloadCount: number): number {
  return voteScore + Math.log10(downloadCount + 1)
}

// ── File helpers ──────────────────────────────────────────────

export function isPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false
  return mimeType === 'application/pdf' || mimeType.startsWith('image/')
}

export function fileIcon(mimeType: string | null): string {
  if (!mimeType) return '📎'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.includes('word')) return '📝'
  return '📎'
}

// ── Rate limit keys ───────────────────────────────────────────

export function uploadRateLimitKey(userId: string): string {
  return `community_upload:${userId}`
}

export function commentRateLimitKey(userId: string): string {
  return `community_comment:${userId}`
}

export function voteRateLimitKey(userId: string): string {
  return `community_vote:${userId}`
}
