-- ============================================================
-- CHOTU baseline supplement
-- Cross-schema objects missed by a public-schema-only dump:
--   storage.buckets, storage.objects policies,
--   pg_cron job, auth.users trigger binding
-- All statements are idempotent (safe to re-run).
-- Captured: 2026-06-03
-- ============================================================

-- ── 1. Storage buckets ────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'attachments', 'attachments', false, 52428800,
    ARRAY[
      'image/jpeg','image/png','image/pdf','application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  ),
  (
    'avatars', 'avatars', true, 2097152,
    ARRAY['image/jpeg','image/png','image/webp','image/gif']
  ),
  (
    'community-files', 'community-files', false, 10485760,
    ARRAY[
      'application/pdf','image/png','image/jpeg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain','text/markdown'
    ]
  )
ON CONFLICT (id) DO NOTHING;

-- ── 2. storage.objects RLS policies ──────────────────────────
-- Drop first so re-runs are clean; CREATE does not support IF NOT EXISTS.

-- attachments
DROP POLICY IF EXISTS "attachments: owner read"   ON storage.objects;
DROP POLICY IF EXISTS "attachments: owner insert" ON storage.objects;
DROP POLICY IF EXISTS "attachments: owner delete" ON storage.objects;

CREATE POLICY "attachments: owner read" ON storage.objects
  AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'attachments'::text) AND
         ((auth.uid())::text = (storage.foldername(name))[1]));

CREATE POLICY "attachments: owner insert" ON storage.objects
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((bucket_id = 'attachments'::text) AND
              ((auth.uid())::text = (storage.foldername(name))[1]));

CREATE POLICY "attachments: owner delete" ON storage.objects
  AS PERMISSIVE FOR DELETE TO public
  USING ((bucket_id = 'attachments'::text) AND
         ((auth.uid())::text = (storage.foldername(name))[1]));

-- avatars
DROP POLICY IF EXISTS "avatars: public read"  ON storage.objects;
DROP POLICY IF EXISTS "avatars: owner insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars: owner update" ON storage.objects;
DROP POLICY IF EXISTS "avatars: owner delete" ON storage.objects;

CREATE POLICY "avatars: public read" ON storage.objects
  AS PERMISSIVE FOR SELECT TO public
  USING (bucket_id = 'avatars'::text);

CREATE POLICY "avatars: owner insert" ON storage.objects
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((bucket_id = 'avatars'::text) AND
              ((auth.uid())::text = (storage.foldername(name))[1]));

CREATE POLICY "avatars: owner update" ON storage.objects
  AS PERMISSIVE FOR UPDATE TO public
  USING ((bucket_id = 'avatars'::text) AND
         ((auth.uid())::text = (storage.foldername(name))[1]));

CREATE POLICY "avatars: owner delete" ON storage.objects
  AS PERMISSIVE FOR DELETE TO public
  USING ((bucket_id = 'avatars'::text) AND
         ((auth.uid())::text = (storage.foldername(name))[1]));

-- community-files
DROP POLICY IF EXISTS "community_files_select" ON storage.objects;
DROP POLICY IF EXISTS "community_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "community_files_delete" ON storage.objects;

CREATE POLICY "community_files_select" ON storage.objects
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (bucket_id = 'community-files'::text);

CREATE POLICY "community_files_insert" ON storage.objects
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'community-files'::text) AND
              ((storage.foldername(name))[1] = (auth.uid())::text));

CREATE POLICY "community_files_delete" ON storage.objects
  AS PERMISSIVE FOR DELETE TO authenticated
  USING ((bucket_id = 'community-files'::text) AND
         (((storage.foldername(name))[1] = (auth.uid())::text) OR
          (EXISTS (
            SELECT 1 FROM profiles
            WHERE ((profiles.id = auth.uid()) AND (profiles.is_admin = true))
          ))));

-- ── 3. pg_cron job ────────────────────────────────────────────
-- Idempotent: unschedule by name first (no-op if not exists),
-- then re-schedule.
SELECT cron.unschedule('community-post-expiry') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'community-post-expiry'
);

SELECT cron.schedule(
  'community-post-expiry',     -- job name
  '30 20 * * *',               -- 8:30 PM UTC daily (≈ 2 AM IST)
  $$
    UPDATE community_posts
    SET deleted_at = NOW()
    WHERE expires_at < NOW()
      AND deleted_at IS NULL;
  $$
);

-- ── 4. auth.users trigger binding ────────────────────────────
-- handle_new_user() function is in public schema (in the baseline).
-- The trigger that fires it lives on auth.users, outside public.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
