import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit IV for GCM

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

export function encryptToken(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  // Format: iv(12):tag(16):ciphertext — all hex
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

export function decryptToken(ciphertext: string): string {
  const key = getKey()
  const [ivHex, tagHex, dataHex] = ciphertext.split(':')
  if (!ivHex || !tagHex || !dataHex) throw new Error('Invalid ciphertext format')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const data = Buffer.from(dataHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(data).toString('utf8') + decipher.final('utf8')
}

// ─── Token storage ────────────────────────────────────────────────────────────

export interface GoogleTokens {
  access_token: string
  refresh_token: string
  expires_at: Date
}

export async function storeGoogleTokens(userId: string, tokens: GoogleTokens): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('google_integrations').upsert(
    {
      user_id:                 userId,
      encrypted_access_token:  encryptToken(tokens.access_token),
      encrypted_refresh_token: encryptToken(tokens.refresh_token),
      expires_at:              tokens.expires_at.toISOString(),
      scope:                   'https://www.googleapis.com/auth/calendar.events',
    },
    { onConflict: 'user_id' },
  )
  if (error) {
    console.error('[storeGoogleTokens]', error.message)
    throw new Error('Failed to store Google tokens')
  }
}

export async function getGoogleTokens(userId: string): Promise<GoogleTokens | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('google_integrations')
    .select('encrypted_access_token, encrypted_refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null

  try {
    return {
      access_token:  decryptToken(data.encrypted_access_token),
      refresh_token: decryptToken(data.encrypted_refresh_token),
      expires_at:    new Date(data.expires_at),
    }
  } catch {
    console.error('[getGoogleTokens] decryption failed')
    return null
  }
}

export async function deleteGoogleIntegration(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('google_integrations').delete().eq('user_id', userId)
}

export async function hasGoogleIntegration(userId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('google_integrations')
    .select('id')
    .eq('user_id', userId)
    .single()
  return !!data
}

// ─── Token refresh ───────────────────────────────────────────────────────────

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const tokens = await getGoogleTokens(userId)
  if (!tokens) return null

  // If token expires in more than 60 seconds, it's still valid
  const expiresInMs = tokens.expires_at.getTime() - Date.now()
  if (expiresInMs > 60_000) return tokens.access_token

  // Refresh the token
  try {
    const refreshed = await refreshAccessToken(tokens.refresh_token)
    await storeGoogleTokens(userId, {
      access_token:  refreshed.access_token,
      refresh_token: tokens.refresh_token, // Google only sends a new refresh token on first auth
      expires_at:    new Date(Date.now() + refreshed.expires_in * 1000),
    })
    return refreshed.access_token
  } catch {
    console.error('[getValidAccessToken] token refresh failed for user', userId)
    return null
  }
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[refreshAccessToken] Google error:', res.status, body.slice(0, 200))
    throw new Error('Token refresh failed')
  }

  return res.json()
}

// ─── Revoke ───────────────────────────────────────────────────────────────────

export async function revokeGoogleToken(accessToken: string): Promise<void> {
  // Best-effort — don't throw if revocation fails
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
    })
  } catch {
    console.error('[revokeGoogleToken] revocation request failed')
  }
}
