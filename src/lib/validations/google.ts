import { z } from 'zod'

export const oauthCallbackSchema = z.object({
  code:  z.string().min(1, 'Missing authorization code'),
  state: z.string().min(1, 'Missing state parameter'),
})

export const googleIntegrationSchema = z.object({
  user_id:                 z.string().uuid(),
  encrypted_access_token:  z.string().min(1),
  encrypted_refresh_token: z.string().min(1),
  expires_at:              z.string().datetime(),
  scope:                   z.string().min(1),
})
